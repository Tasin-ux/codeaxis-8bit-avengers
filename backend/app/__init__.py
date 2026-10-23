import os

# Ensure pure-python fallback for SQLAlchemy when C-extensions are blocked by AppLocker/Application Control
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"
