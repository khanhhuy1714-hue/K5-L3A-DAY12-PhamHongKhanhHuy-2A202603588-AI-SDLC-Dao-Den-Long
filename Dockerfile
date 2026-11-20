FROM python:3.12-slim

WORKDIR /app
COPY . /app

RUN python3 -m compileall -q src
EXPOSE 8000

CMD ["python3", "src/play.py", "--no-browser"]
