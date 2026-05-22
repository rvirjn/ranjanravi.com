import argparse
import json
import os
import sys
from datetime import date, datetime
from pathlib import Path

from bson import ObjectId
from pymongo import MongoClient

_MAIN_DIR = Path(__file__).resolve().parents[1] / "main"
if str(_MAIN_DIR) not in sys.path:
    sys.path.insert(0, str(_MAIN_DIR))

from constant import (  # noqa: E402
    MONGO_DEFAULT_COLLECTION,
    MONGO_DEFAULT_DB,
    MONGO_DEFAULT_DOCUMENT_LIMIT,
    MONGO_DEFAULT_URI,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read and print documents from a MongoDB collection."
    )
    parser.add_argument(
        "--mongo-uri",
        default=os.getenv("MONGODB_URI", MONGO_DEFAULT_URI),
        help=f"MongoDB URI (default: env MONGODB_URI or {MONGO_DEFAULT_URI}).",
    )
    parser.add_argument(
        "--db",
        default=os.getenv("MONGO_DB", MONGO_DEFAULT_DB),
        help=f"Database name (default: env MONGO_DB or {MONGO_DEFAULT_DB}).",
    )
    parser.add_argument(
        "--collection",
        default=os.getenv("MONGO_COLLECTION", MONGO_DEFAULT_COLLECTION),
        help=f"Collection name (default: env MONGO_COLLECTION or {MONGO_DEFAULT_COLLECTION}).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=MONGO_DEFAULT_DOCUMENT_LIMIT,
        help=f"Maximum number of documents to print (default: {MONGO_DEFAULT_DOCUMENT_LIMIT}).",
    )
    return parser.parse_args()


def to_json_safe(value):
    if isinstance(value, dict):
        return {key: to_json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [to_json_safe(item) for item in value]
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def main() -> None:
    args = parse_args()
    client = MongoClient(args.mongo_uri)
    collection = client[args.db][args.collection]

    documents = list(collection.find().limit(args.limit))
    print(json.dumps(to_json_safe(documents), indent=2, ensure_ascii=False))
    client.close()


if __name__ == "__main__":
    main()
