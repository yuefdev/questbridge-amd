# Evidence status

Date: 14 October 2026.

- ACT III enrolment: confirmed in the signed-in event UI.
- Solo team: **QuestBridge**, UTC+03:00, created.
- AMD Token Factory: signed in, but shows **"Your email is not registered for API key distribution. Please contact the event organizer."** after team creation.
- Live local inference: **performed on AMD Ryzen 9 7950X3D CPU** with llama.cpp b11624 and Qwen3-4B-Instruct-2507 Q4_K_M. No AMD GPU result is claimed. See `CPU_RESULTS.md` for actual failures and quality limits.
- Prototype tests: **5 passed, 0 failed** (`npm test`, Node.js 24.19.0). These are deterministic validation/cache tests with a mocked endpoint.
- Hackathon submission: **platform confirmation received** on 14 October 2026, with repository, cover, video presentation, pitch PDF and a live reviewer URL. [Submission page](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/questbridge/questbridge-reviewable-quest-localisation).
- Judging eligibility: **not confirmed**. Organisers were asked whether the local AMD CPU route qualifies and how programme participation credit is awarded. Form acceptance is not an award decision.
- Public reviewer demo: actually tested over HTTPS, with an authenticated translation returning HTTP 200 and eight protected game tokens. Unauthenticated API access returned 401. Availability depends on the host and tunnel continuing to run; the access token is not published in source.
- Existing AutoTranslation showcase: updated with the real CPU experiment; featured-member selection not yet awarded.
- AMD programme account verified after delivery: **320 points**. Compared with the previous 315-point snapshot, only **+5 points** are verified. The advertised +300 hackathon participation credit, +250 featured-member credit and +500 event attendance credit are **not yet awarded**.
- Upcoming webinar registration: completed for **Managing Enterprise AI Costs: The Case for Hybrid AI**, 28 October 2026, 20:00 Istanbul time, 45 minutes. Attendance has **not happened**, and programme-point eligibility is unconfirmed.

The original quest samples and tests in this repository are new work. Test responses are explicitly mocked and are not live-inference evidence.
