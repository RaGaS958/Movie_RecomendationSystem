"""
Movie Recommendation System - FastAPI Backend
Run: uvicorn main:app --reload --host 0.0.0.0 --port 8000

Place these files in the SAME directory:
  - main.py
  - df.pkl
  - indices.pkl
  - tfidf.pkl
  - tfidf_matrix.pkl
  - movies_metadata.csv  (optional - enriches posters/dates)
  - static/
      index.html
      style.css
      app.js
"""

import pickle
import ast
import os
import re
import math
import numpy as np
import pandas as pd
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sklearn.metrics.pairwise import cosine_similarity
from pydantic import BaseModel

# ─────────────────────────────────────────────
# App Init
# ─────────────────────────────────────────────
app = FastAPI(
    title="CineMatrix API",
    description="Movie Recommendation Engine powered by TF-IDF & Cosine Similarity",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Load Pickled Model Artifacts
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("📦 Loading model artifacts...")
df: pd.DataFrame = pd.read_pickle(os.path.join(BASE_DIR, "df.pkl"))
indices: pd.Series = pickle.load(open(os.path.join(BASE_DIR, "indices.pkl"), "rb"))
tfidf_matrix = pickle.load(open(os.path.join(BASE_DIR, "tfidf_matrix.pkl"), "rb"))
tfidf = pickle.load(open(os.path.join(BASE_DIR, "tfidf.pkl"), "rb"))
print(f"✅ Loaded {len(df)} movies.")

# ─────────────────────────────────────────────
# Enrich df with poster_path & release_date from CSV
# ─────────────────────────────────────────────
TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500"
csv_path = os.path.join(BASE_DIR, "movies_metadata.csv")

if os.path.exists(csv_path):
    print("🗂️  Enriching with movies_metadata.csv...")
    try:
        meta = pd.read_csv(csv_path, low_memory=False)
        meta = meta[['title', 'poster_path', 'release_date', 'imdb_id', 'revenue', 'runtime', 'vote_count']].dropna(subset=['title'])
        meta = meta.drop_duplicates(subset=['title'])
        df = df.merge(meta, on='title', how='left')
        print("✅ CSV enrichment complete.")
    except Exception as e:
        print(f"⚠️  CSV enrichment failed: {e}")
else:
    print("⚠️  movies_metadata.csv not found — poster/dates unavailable. Download from Kaggle: 'The Movies Dataset'")
    df['poster_path'] = None
    df['release_date'] = None
    df['imdb_id'] = None
    df['revenue'] = None
    df['runtime'] = None
    df['vote_count'] = None

df = df.reset_index(drop=True)

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
GENRE_COLORS = {
    "Action": "#e63946", "Adventure": "#f4a261", "Animation": "#2a9d8f",
    "Comedy": "#e9c46a", "Crime": "#8338ec", "Documentary": "#06d6a0",
    "Drama": "#118ab2", "Fantasy": "#9b5de5", "Horror": "#d62828",
    "Mystery": "#7209b7", "Romance": "#ff006e", "Science Fiction": "#3a86ff",
    "Thriller": "#ff4d6d", "War": "#606c38", "Family": "#ffbe0b",
    "History": "#bc6c25", "Music": "#c77dff", "Western": "#b5838d",
    "Foreign": "#4cc9f0", "TV Movie": "#6c757d",
}

def safe_float(val, default=0.0):
    try:
        v = float(val)
        return default if math.isnan(v) else v
    except:
        return default

def safe_str(val, default=""):
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return default
    return str(val)

def build_movie_obj(row: pd.Series) -> dict:
    poster = safe_str(row.get('poster_path'))
    poster_url = f"{TMDB_IMG_BASE}{poster}" if poster and poster.startswith('/') else None

    genres_raw = safe_str(row.get('genres', ''))
    genres_list = [g.strip() for g in genres_raw.split() if g.strip()] if genres_raw else []

    return {
        "title": safe_str(row.get('title')),
        "overview": safe_str(row.get('overview')),
        "genres": genres_list,
        "tagline": safe_str(row.get('tagline')),
        "vote_average": round(safe_float(row.get('vote_average')), 1),
        "vote_count": int(safe_float(row.get('vote_count'))),
        "popularity": round(safe_float(row.get('popularity')), 2),
        "poster_url": poster_url,
        "release_date": safe_str(row.get('release_date')),
        "release_year": safe_str(row.get('release_date', ''))[:4] if safe_str(row.get('release_date')) else "",
        "imdb_id": safe_str(row.get('imdb_id')),
        "runtime": int(safe_float(row.get('runtime'))),
        "revenue": int(safe_float(row.get('revenue'))),
        "genre_colors": {g: GENRE_COLORS.get(g, "#6c757d") for g in genres_list},
    }

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/")
def root():
    static_path = os.path.join(BASE_DIR, "static", "index.html")
    if os.path.exists(static_path):
        return FileResponse(static_path)
    return {"message": "CineMatrix API is live 🎬", "docs": "/docs"}


@app.get("/api/movies/top")
def get_top_movies(
    n: int = Query(10, ge=1, le=50, description="Number of movies: 5, 10, or 20"),
    sort_by: str = Query("popularity", description="Sort by: popularity | vote_average | vote_count | revenue"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    min_rating: float = Query(0.0, ge=0.0, le=10.0),
):
    """Get top N movies sorted by metric."""
    valid_sort = ["popularity", "vote_average", "vote_count", "revenue"]
    if sort_by not in valid_sort:
        sort_by = "popularity"

    filtered = df.copy()
    if genre:
        filtered = filtered[filtered['genres'].str.contains(genre, case=False, na=False)]

    filtered = filtered[filtered['vote_average'] >= min_rating]

    if sort_by in filtered.columns:
        filtered = filtered.sort_values(by=sort_by, ascending=False)

    filtered = filtered.head(n)
    return {
        "count": len(filtered),
        "sort_by": sort_by,
        "genre_filter": genre,
        "movies": [build_movie_obj(row) for _, row in filtered.iterrows()]
    }


@app.get("/api/movies/search")
def search_movies(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=50),
):
    """Search movies by title."""
    q_lower = q.lower()
    mask = df['title'].str.lower().str.contains(re.escape(q_lower), na=False)
    results = df[mask].head(limit)
    return {
        "query": q,
        "count": len(results),
        "movies": [build_movie_obj(row) for _, row in results.iterrows()]
    }


@app.get("/api/movies/recommend/{title}")
def recommend_movies(
    title: str,
    n: int = Query(10, ge=1, le=30),
):
    """Get TF-IDF cosine-similarity based recommendations."""
    # exact match first
    if title in indices.index:
        idx = indices[title]
    else:
        # try case-insensitive
        matches = [t for t in indices.index if t.lower() == title.lower()]
        if not matches:
            raise HTTPException(status_code=404, detail=f"Movie '{title}' not found in database.")
        idx = indices[matches[0]]
        title = matches[0]

    # handle duplicate indices (Series may return multiple)
    if isinstance(idx, pd.Series):
        idx = int(idx.iloc[0])
    else:
        idx = int(idx)

    sim_scores = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).flatten()
    similar_indices = sim_scores.argsort()[::-1][1:n+1]

    recs = []
    for i in similar_indices:
        row = df.iloc[i]
        obj = build_movie_obj(row)
        obj["similarity_score"] = round(float(sim_scores[i]), 4)
        recs.append(obj)

    source_movie = build_movie_obj(df.iloc[idx])

    return {
        "source_movie": source_movie,
        "recommendations": recs,
        "count": len(recs),
    }


@app.get("/api/movies/trending")
def get_trending(n: int = Query(20, ge=1, le=50)):
    """High popularity + high rating movies."""
    filtered = df[(df['vote_average'] >= 7.0) & (df['popularity'] >= 5.0)]
    filtered = filtered.sort_values('popularity', ascending=False).head(n)
    return {
        "count": len(filtered),
        "movies": [build_movie_obj(row) for _, row in filtered.iterrows()]
    }


@app.get("/api/movies/genres")
def get_genres():
    """Return all available genres."""
    all_genres = set()
    for g_str in df['genres'].dropna():
        for g in str(g_str).split():
            if len(g) > 2:
                all_genres.add(g.strip())
    return {
        "genres": sorted(list(all_genres)),
        "colors": GENRE_COLORS
    }


@app.get("/api/movies/{title}")
def get_movie_detail(title: str):
    """Get single movie details."""
    if title in indices.index:
        idx = indices[title]
        if isinstance(idx, pd.Series):
            idx = int(idx.iloc[0])
        return build_movie_obj(df.iloc[int(idx)])

    matches = df[df['title'].str.lower() == title.lower()]
    if matches.empty:
        raise HTTPException(status_code=404, detail=f"Movie '{title}' not found.")
    return build_movie_obj(matches.iloc[0])


@app.get("/api/stats")
def get_stats():
    """Dataset statistics."""
    return {
        "total_movies": len(df),
        "avg_rating": round(float(df['vote_average'].mean()), 2),
        "genres_count": df['genres'].nunique(),
        "top_rated": safe_str(df.loc[df['vote_average'].idxmax(), 'title']),
        "most_popular": safe_str(df.loc[df['popularity'].idxmax(), 'title']),
    }


# ─────────────────────────────────────────────
# Static File Serving
# ─────────────────────────────────────────────
static_dir = os.path.join(BASE_DIR, "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
