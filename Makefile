.PHONY: dev test

dev:
	docker compose up --build

test:
	python -m unittest discover -s compiler-core/tests -v
