import json
import os

import redis

from fastapi import FastAPI, HTTPException
from pymongo import MongoClient

app = FastAPI()

success = {"message": "Hello World from Forest Watcher Form Service!"}


@app.get("/v1/form")
def root():
    return success


@app.get("/v1/questionnaire")
def root():
    return success


@app.get("/v1/report")
def root():
    return success


@app.get("/v1/form/healthcheck")
def root():
    errors = list()

    vars = ["ENV",
            "LOG_LEVEL",
            "BUCKET",
            "REDIS_ENDPOINT",
            "TARGET_SHEET_ID",
            "LEGACY_TEMPLATE_ID",
            "DEFAULT_TEMPLATE_ID",
            "WRI_MAIL_RECIPIENTS",
            "DB_SECRET",
            "GOOGLE_PRIVATE_KEY",
            "GOOGLE_PROJECT_EMAIL"
            ]

    for var in vars:
        try:
            assert os.getenv(var), f"Cannot access {var} variable"
        except Exception as e:
            errors.append(e)

    mongodb_secret = json.loads(os.getenv("DB_SECRET"))

    # Provide the mongodb atlas url to connect python to mongodb using pymongo
    connection_str = f"mongodb+srv://{mongodb_secret['username']}:{mongodb_secret['password']}@{mongodb_secret['endpoint']}"

    try:
        client = MongoClient(connection_str)
        client.close()
    except Exception as e:
        errors.append(e)

    try:
        redis.Redis(host=os.getenv("REDIS_ENDPOINT"))
    except Exception as e:
        errors.append(e)

    if errors:
        raise HTTPException(status_code=500, detail=fr"Health check failed\n.{[str(e) for e in errors]}")
    else:
        return {"message": "OK"}
