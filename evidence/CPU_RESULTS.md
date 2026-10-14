# Local AMD CPU evidence

This is a real inference recording, **not GPU or AMD Token Factory evidence**.

## Setup

- Processor, reported by the OS: AMD Ryzen 9 7950X3D 16-Core Processor.
- Host: Windows, build 10.0.26300; Node.js 24.19.0.
- [llama.cpp b11624](https://github.com/ggml-org/llama.cpp/releases/tag/b11624), Windows x64 CPU binary. Process launched with `-ngl 0`, eight threads, context 4096, loopback port 8187.
- Model: [unsloth/Qwen3-4B-Instruct-2507-GGUF](https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF), revision `a06e946bb6b655725eafa393f4a9745d460374c9`, `Qwen3-4B-Instruct-2507-Q4_K_M.gguf`. Apache-2.0 model licence, separate from this application's MIT licence.
- Model SHA-256: `3605803b982cb64aead44f6c1b2ae36e3acdb41d8e46c8a94c6533bc4c67e597`, checked against the model repository's LFS metadata before execution.
- Runtime ZIP SHA-256: `57f436b5153fc411b4dc13a2d24b45d91968e1163a6c5bf3941d20bb28689e8c`, checked against the GitHub release asset digest.

The model weights and runtime are not included in this repository.

## Recorded trials

1. `run-2026-10-14T21-07-06-188Z.json`: Qwen2.5-1.5B, original marker-roundtrip strategy. **All five requests rejected**, with marker damage or invalid JSON. An earlier smaller model's weights were not useful for the required task.
2. `run-2026-10-14T21-11-56-226Z.json`: Qwen3-4B, original strategy. **All five requests rejected**. Inspection showed that the model changed square-bracket markers to braces and ignored the requested object shape.
3. `run-2026-10-14T21-15-27-962Z.json`: after moving immutable syntax ownership to the host and constraining the fragment-array structure, four live outputs passed syntax checks and a repeat hit the cache. **The two Forest outputs copied English unchanged.** This exposed a quality gap and led to an additional rejection rule; this trial is not treated as successful localisation.
4. `run-2026-10-14T21-18-12-792Z.json`: final recorded application, four unique live requests. **Two format-valid drafts, two unchanged-English rejections, one cache hit**. No failed output was cached.

## What the evidence establishes

- Real open-model requests ran locally on an AMD CPU.
- Immutable game syntax stayed under application control.
- Fully copied English and damaged structure were rejected visibly.
- Repeating the accepted Forge/German draft used the cache and avoided an additional model call.
- There are raw source strings, returned strings, token usage, timings, model identity and counters in the JSON reports.

## What it does not establish

- Linguistic quality: the Turkish Forge draft mistranslates several terms and has awkward word order. It must not be shipped as a verified translation. German is also a reviewable draft, not a gold-standard label.
- GPU performance, scalability, relative speedup, lower cost or contest eligibility.
- Cloud provisioning: Token Factory still requires the team's account assignment.

Fixed fragment boundaries are a current limitation. The useful current outcome is an auditable **draft-and-review prototype**, not automatic high-quality game localisation. Bad trials remain available instead of being hidden.

## Reproduce the final run

Run the pinned CPU model in llama.cpp, then set:

```powershell
$env:AMD_ENDPOINT = "http://127.0.0.1:8187/v1/chat/completions"
$env:AMD_MODEL = "Qwen3-4B-Instruct-2507-Q4_K_M"
npm start
```

In a second terminal:

```powershell
npm run demo:record
```

The recording command writes a timestamped evidence file. It exits unsuccessfully when any input is rejected, while retaining the real failure evidence. Mock tests are a separate `npm test` command.
