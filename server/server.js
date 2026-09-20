const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

const MAX_TEXT_LENGTH = 5000;

const SUPPORTED_LANGUAGES = [
  "en",
  "hi",
  "mr",
  "gu",
  "es",
  "fr",
  "de",
];

const LANGUAGE_NAMES = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  gu: "Gujarati",
  es: "Spanish",
  fr: "French",
  de: "German",
};

// ==============================
// GEMINI
// ==============================

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
};

// ==============================
// SECURITY
// ==============================

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// ==============================
// CORS
// ==============================

const allowedOrigins = [
  "http://localhost:5173",
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(
    process.env.FRONTEND_URL
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(
          "Origin not allowed by CORS."
        )
      );
    },

    methods: [
      "GET",
      "POST",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// ==============================
// BODY PARSER
// ==============================

app.use(
  express.json({
    limit: "100kb",
  })
);

// ==============================
// GENERAL RATE LIMIT
// ==============================

const apiLimiter = rateLimit({
  windowMs:
    15 * 60 * 1000,

  limit: 150,

  standardHeaders:
    "draft-7",

  legacyHeaders: false,

  message: {
    success: false,

    message:
      "Too many requests. Please wait a few minutes and try again.",
  },
});

app.use(
  "/api",
  apiLimiter
);

// ==============================
// TTS RATE LIMIT
// ==============================

const ttsLimiter = rateLimit({
  windowMs:
    10 * 60 * 1000,

  limit: 20,

  standardHeaders:
    "draft-7",

  legacyHeaders: false,

  message: {
    success: false,

    message:
      "Too many speech generation requests. Please wait before generating more speech.",
  },
});

// ==============================
// TRANSLATION RATE LIMIT
// ==============================

const translationLimiter =
  rateLimit({
    windowMs:
      10 * 60 * 1000,

    limit: 30,

    standardHeaders:
      "draft-7",

    legacyHeaders: false,

    message: {
      success: false,

      message:
        "Too many translation requests. Please wait before trying again.",
    },
  });

// ==============================
// HOME
// ==============================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,

    message:
      "Text-to-Speech backend is running",
  });
});

// ==============================
// HEALTH
// ==============================

app.get(
  "/api/health",
  (req, res) => {
    res.status(200).json({
      success: true,

      message:
        "API is healthy",

      services: {
        textToSpeech:
          Boolean(
            process.env
              .ELEVENLABS_API_KEY
          ),

        translation:
          Boolean(
            process.env
              .GEMINI_API_KEY
          ),
      },
    });
  }
);

// ==============================
// GET VOICES
// ==============================

app.get(
  "/api/voices",
  async (req, res) => {
    try {
      if (
        !process.env
          .ELEVENLABS_API_KEY
      ) {
        return res
          .status(500)
          .json({
            success: false,

            message:
              "Text-to-speech service is not configured.",
          });
      }

      const response =
        await axios.get(
          "https://api.elevenlabs.io/v1/voices",
          {
            headers: {
              "xi-api-key":
                process.env
                  .ELEVENLABS_API_KEY,
            },

            timeout: 15000,
          }
        );

      const voices =
        Array.isArray(
          response.data?.voices
        )
          ? response.data.voices.map(
              (voice) => ({
                voiceId:
                  voice.voice_id,

                name:
                  voice.name,

                category:
                  voice.category,

                labels:
                  voice.labels ||
                  {},

                previewUrl:
                  voice.preview_url ||
                  null,
              })
            )
          : [];

      return res
        .status(200)
        .json({
          success: true,
          voices,
        });
    } catch (error) {
      console.error(
        "Voice API error:",
        error.response?.data ||
          error.message
      );

      if (
        error.response
          ?.status === 429
      ) {
        return res
          .status(429)
          .json({
            success: false,

            message:
              "The speech service usage limit has been reached. Please try again later.",
          });
      }

      return res
        .status(502)
        .json({
          success: false,

          message:
            "Unable to retrieve voices from the speech service.",
        });
    }
  }
);

// ==============================
// TRANSLATION
// ==============================

app.post(
  "/api/translate",
  translationLimiter,
  async (req, res) => {
    try {
      const {
        text,
        targetLanguage,
      } = req.body || {};

      // ==========================
      // TEXT VALIDATION
      // ==========================

      if (
        typeof text !==
          "string" ||
        !text.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Text is required for translation.",
          });
      }

      const cleanedText =
        text.trim();

      if (
        cleanedText.length >
        MAX_TEXT_LENGTH
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              `Text cannot exceed ${MAX_TEXT_LENGTH} characters.`,
          });
      }

      // ==========================
      // LANGUAGE VALIDATION
      // ==========================

      if (
        typeof targetLanguage !==
          "string" ||
        !SUPPORTED_LANGUAGES.includes(
          targetLanguage
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Please select a supported target language.",
          });
      }

      // ==========================
      // ENGLISH DOES NOT NEED
      // TRANSLATION
      // ==========================

      if (
        targetLanguage === "en"
      ) {
        return res
          .status(200)
          .json({
            success: true,

            originalText:
              cleanedText,

            translatedText:
              cleanedText,

            targetLanguage:
              "en",

            targetLanguageName:
              "English",

            translated: false,
          });
      }

      // ==========================
      // GEMINI CHECK
      // ==========================

      const ai =
        getGeminiClient();

      if (!ai) {
        console.error(
          "GEMINI_API_KEY is missing."
        );

        return res
          .status(500)
          .json({
            success: false,

            message:
              "Translation service is not configured.",
          });
      }

      const targetLanguageName =
        LANGUAGE_NAMES[
          targetLanguage
        ];

      // ==========================
      // GEMINI TRANSLATION
      // ==========================

      const response =
        await ai.models.generateContent({
          model:
            "gemini-3.6-flash",

          contents:
            cleanedText,

          config: {
            systemInstruction:
              `You are a professional translation engine.

Translate the user's text into ${targetLanguageName}.

Rules:
- Preserve the original meaning accurately.
- Preserve names, numbers, dates and important terminology.
- Use natural, fluent ${targetLanguageName}.
- Use the normal writing script for ${targetLanguageName}.
- Do not summarize.
- Do not explain the translation.
- Do not add quotation marks.
- Do not add labels such as "Translation:".
- Return only the translated text.`,
          },
        });

      const translatedText =
        response.text?.trim();

      if (!translatedText) {
        throw new Error(
          "Gemini returned an empty translation."
        );
      }

      return res
        .status(200)
        .json({
          success: true,

          originalText:
            cleanedText,

          translatedText,

          targetLanguage,

          targetLanguageName,

          translated: true,
        });
    } catch (error) {
      console.error(
        "TRANSLATION ERROR:",
        error.message
      );

      const status =
        error.status ||
        error.response?.status;

      if (status === 429) {
        return res
          .status(429)
          .json({
            success: false,

            message:
              "Translation usage limit has been reached. Please try again later.",
          });
      }

      if (
        status === 401 ||
        status === 403
      ) {
        return res
          .status(502)
          .json({
            success: false,

            message:
              "Unable to authenticate with the translation service.",
          });
      }

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Translation failed. Please try again.",
        });
    }
  }
);

// ==============================
// TEXT TO SPEECH
// ==============================

app.post(
  "/api/tts",
  ttsLimiter,
  async (req, res) => {
    try {
      const {
        text,
        voice,
        language,
      } = req.body || {};

      // ==========================
      // TEXT VALIDATION
      // ==========================

      if (
        typeof text !==
          "string" ||
        !text.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Text is required.",
          });
      }

      const cleanedText =
        text.trim();

      if (
        cleanedText.length >
        MAX_TEXT_LENGTH
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              `Text cannot exceed ${MAX_TEXT_LENGTH} characters.`,
          });
      }

      // ==========================
      // LANGUAGE VALIDATION
      // ==========================

      if (
        typeof language !==
          "string" ||
        !SUPPORTED_LANGUAGES.includes(
          language
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Please select a supported language.",
          });
      }

      // ==========================
      // VOICE VALIDATION
      // ==========================

      if (
        typeof voice !==
          "string" ||
        !voice.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "A voice must be selected.",
          });
      }

      const cleanedVoice =
        voice.trim();

      if (
        cleanedVoice.length >
          100 ||
        !/^[A-Za-z0-9_-]+$/.test(
          cleanedVoice
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid voice selection.",
          });
      }

      // ==========================
      // ELEVENLABS KEY
      // ==========================

      if (
        !process.env
          .ELEVENLABS_API_KEY
      ) {
        console.error(
          "ELEVENLABS_API_KEY is missing."
        );

        return res
          .status(500)
          .json({
            success: false,

            message:
              "Text-to-speech service is not configured.",
          });
      }

      console.log(
        "Generating speech:",
        {
          language,
          characters:
            cleanedText.length,
        }
      );

      // ==========================
      // ELEVENLABS REQUEST
      // ==========================

      const response =
        await axios({
          method: "POST",

          url:
            "https://api.elevenlabs.io/v1/text-to-speech/" +
            encodeURIComponent(
              cleanedVoice
            ),

          headers: {
            "xi-api-key":
              process.env
                .ELEVENLABS_API_KEY,

            "Content-Type":
              "application/json",

            Accept:
              "audio/mpeg",
          },

          params: {
            output_format:
              "mp3_44100_128",
          },

          data: {
            text:
              cleanedText,

            model_id:
              "eleven_v3",

            voice_settings: {
              stability: 0.5,

              similarity_boost:
                0.75,
            },
          },

          responseType:
            "arraybuffer",

          timeout: 60000,

          maxContentLength:
            20 * 1024 * 1024,

          maxBodyLength:
            20 * 1024 * 1024,
        });

      // ==========================
      // VERIFY AUDIO
      // ==========================

      if (
        !response.data ||
        response.data.length ===
          0
      ) {
        return res
          .status(502)
          .json({
            success: false,

            message:
              "The speech provider returned an empty audio response.",
          });
      }

      // ==========================
      // RETURN MP3
      // ==========================

      res.set({
        "Content-Type":
          "audio/mpeg",

        "Content-Disposition":
          'inline; filename="speech.mp3"',

        "Content-Length":
          response.data.length,

        "Cache-Control":
          "no-store",

        "X-Content-Type-Options":
          "nosniff",
      });

      return res
        .status(200)
        .send(
          Buffer.from(
            response.data
          )
        );
    } catch (error) {
      let elevenLabsError =
        null;

      if (
        error.response?.data
      ) {
        try {
          const errorString =
            Buffer.isBuffer(
              error.response.data
            )
              ? error.response.data.toString(
                  "utf8"
                )
              : error.response.data;

          elevenLabsError =
            typeof errorString ===
            "string"
              ? JSON.parse(
                  errorString
                )
              : errorString;
        } catch {
          elevenLabsError =
            "Unable to parse provider error.";
        }
      }

      console.error(
        "TTS ERROR:",
        elevenLabsError ||
          error.message
      );

      if (
        error.code ===
          "ECONNABORTED" ||
        error.code ===
          "ETIMEDOUT"
      ) {
        return res
          .status(504)
          .json({
            success: false,

            message:
              "Speech generation timed out. Please try again.",
          });
      }

      if (
        error.response
          ?.status === 401
      ) {
        return res
          .status(502)
          .json({
            success: false,

            message:
              "Unable to authenticate with the speech provider.",
          });
      }

      if (
        error.response
          ?.status === 429
      ) {
        return res
          .status(429)
          .json({
            success: false,

            message:
              "Speech service usage limit has been reached. Please try again later.",
          });
      }

      if (
        error.response
          ?.status === 400 ||
        error.response
          ?.status === 422
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "The speech provider could not process this request. Please check the text and voice selection.",
          });
      }

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Speech generation failed. Please try again.",
        });
    }
  }
);

// ==============================
// 404
// ==============================

app.use((req, res) => {
  res.status(404).json({
    success: false,

    message:
      "API route not found.",
  });
});

// ==============================
// GLOBAL ERROR HANDLER
// ==============================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "SERVER ERROR:",
      error.message
    );

    if (
      error.message ===
      "Origin not allowed by CORS."
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "This website is not allowed to access the API.",
        });
    }

    if (
      error.type ===
      "entity.too.large"
    ) {
      return res
        .status(413)
        .json({
          success: false,

          message:
            "Request body is too large.",
        });
    }

    return res
      .status(500)
      .json({
        success: false,

        message:
          "An unexpected server error occurred.",
      });
  }
);

// ==============================
// START SERVER
// ==============================

app.listen(PORT, () => {
  console.log(
    `Text-to-Speech server running on http://localhost:${PORT}`
  );

  console.log(
    process.env
      .ELEVENLABS_API_KEY
      ? "ElevenLabs API key loaded successfully."
      : "WARNING: ElevenLabs API key is missing."
  );

  console.log(
    process.env.GEMINI_API_KEY
      ? "Gemini API key loaded successfully."
      : "WARNING: Gemini API key is missing."
  );

  console.log(
    "Security middleware enabled."
  );
});