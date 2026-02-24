# Misbah+ AI Context Form

This project provides a simple web application for generating Misbah+ context
engineering prompts with the aid of Google Gemini AI. It allows users to fill
in the basic parameters of their module (e.g. type of deliverable, desired
outcome, KPIs) and then request AI suggestions for key fields one at a time.

## Features

* Interactive form to capture the essential details of your Misbah+ module.
* Suggestion buttons next to each configurable field (principle, no‑goes,
  operational role, output structure, and delivery format). Pressing a button
  sends a request to the server and returns candidate values from the
  Google Gemini API.
* Automatically constructs a ready‑to‑copy Misbah+ system prompt and a simple
  activation line based on the current form values.

## Getting Started

1. **Install dependencies**

   From the project root:

   ```bash
   npm install
   ```

2. **Set up your Google API key**

   The server uses the Gemini API via HTTP. You must supply your own API key.
   Create a `.env` file in the project root or export `GOOGLE_API_KEY` in your
   environment. For example:

   ```bash
   export GOOGLE_API_KEY=your-google-api-key
   ```

3. **Run the server**

   ```bash
   npm start
   ```

   By default the server listens on `http://localhost:3000`. It serves the
   static assets in `public` and exposes a `POST /suggest-field` endpoint for
   fetching AI suggestions.

4. **Open the app**

   Navigate to `http://localhost:3000` in your browser. Fill in the module
   name and desired outcome first. Then click the “اقتراح” button next to
   any field to fetch suggestions. Click a suggestion to populate the field
   with that value. Finally, click “توليد قالب Misbah+” to generate the full
   system prompt and activation line.

## Customisation

This implementation is intentionally simple. You can extend it by:

* Adjusting the prompt building logic in `server.js` to better suit your
  domain or to include additional context in the request.
* Adding more fields or suggestion buttons to the form. To support a new
  field you simply give the corresponding input element an `id` and a
  `data-field` on its suggestion button that matches the `fieldId` sent to
  `/suggest-field`.
* Implementing caching, rate limiting or other protections on the server.

## Limitations

* The AI suggestions depend on the quality of the underlying model and the
  prompt used. Always review the suggestions critically before selecting
  them.
* If no `GOOGLE_API_KEY` is set or an error occurs while calling the API,
  the server returns a simple fallback list of generic suggestions.

## License

This project is provided under the ISC license. See the `package.json` for
details.