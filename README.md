# GlassBox

GlassBox is a cloud-hosted, multi-language compiler workspace for compiler-design courses. The React/Monaco client talks to an Express API, which queues work in Redis/BullMQ. Isolated Docker workers run Python, C, Java, Node, or the native `glassbox-lang` engine; Postgres stores jobs, users, and shareable snippets.

## Run locally

Copy `.env.example` to `.env`, replace both secrets, then run:

```sh
docker compose up --build
```

Open `http://localhost`. The first build downloads language/runtime images. The worker uses Docker's socket solely to launch per-job containers with `--network=none`, a read-only filesystem, 128 MB memory, 0.5 CPU, 64 PIDs, and an eight-second external timeout.

For HTTPS, terminate TLS in front of nginx or mount Certbot's `/etc/letsencrypt` certificates and add a `listen 443 ssl` server block. Run Certbot's nginx flow after DNS points at the host, then renew on a scheduled `certbot renew` job.

## glassbox-lang pipeline

1. **Lexical analysis** turns source into positioned tokens.
2. **Parsing** is a hand-written recursive-descent parser that builds dataclass AST nodes with operator precedence.
3. **Semantic analysis** checks scoped declarations, assignments, expressions, and calls with line-numbered diagnostics.
4. **Interpretation** is the code-generation equivalent for this teaching language: a tree-walking runtime evaluates the AST with chained environments. It additionally records a source-level trace and serializable AST for the visualizer.

Run the compiler-core suite without external Python packages with `python -m unittest discover -s compiler-core/tests -v`.
