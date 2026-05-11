import argparse
import json
import os
from datetime import date, datetime

from bson import ObjectId
from pymongo import MongoClient


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read and print documents from a MongoDB collection."
    )
    parser.add_argument(
        "--mongo-uri",
        default=os.getenv("MONGODB_URI", "mongodb://host.docker.internal:27017"),
        help="MongoDB URI (default: env MONGODB_URI or mongodb://host.docker.internal:27017).",
    )
    parser.add_argument(
        "--db",
        default=os.getenv("MONGO_DB", "saptarishi"),
        help="Database name (default: env MONGO_DB or saptarishi).",
    )
    parser.add_argument(
        "--collection",
        default=os.getenv("MONGO_COLLECTION", "ocr_results"),
        help="Collection name (default: env MONGO_COLLECTION or ocr_results).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Maximum number of documents to print (default: 20).",
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
