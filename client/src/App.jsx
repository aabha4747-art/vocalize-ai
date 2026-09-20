import { useEffect, useRef, useState } from "react";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

import "./App.css";
import { supabase } from "./supabase";
import Auth from "./components/Auth";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
];

const AUDIO_BUCKET = "speech-audio";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const MAX_CHARACTERS = 5000;

  // ==============================
  // AUTH
  // ==============================

  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // ==============================
  // NAVIGATION
  // ==============================

  const [activePage, setActivePage] = useState("create");

  // ==============================
  // TTS
  // ==============================

  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");

  const [loadingVoices, setLoadingVoices] = useState(true);

  const [audioUrl, setAudioUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [translatedText, setTranslatedText] = useState("");

  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);

  // ==============================
  // DOCUMENT UPLOAD
  // ==============================

  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // ==============================
  // AUDIO
  // ==============================

  const audioRef = useRef(null);

  // ==============================
  // HISTORY / FAVORITES
  // ==============================

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [loadingAudioId, setLoadingAudioId] = useState(null);

  // ==============================
  // AUTH SESSION
  // ==============================

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
        }

        if (mounted) {
          setSession(data.session);
          setCheckingSession(false);
        }
      } catch (err) {
        console.error("Unable to check session:", err);

        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ==============================
  // LOAD VOICES
  // ==============================

  useEffect(() => {
    if (!session) {
      return;
    }

    const fetchVoices = async () => {
      try {
        setLoadingVoices(true);

        const response = await axios.get(`${API_URL}/api/voices`);

        if (
          response.data.success &&
          response.data.voices.length > 0
        ) {
          setVoices(response.data.voices);
          setSelectedVoice(response.data.voices[0].voiceId);
        }
      } catch (err) {
        console.error("Failed to load voices:", err);

        setError(
          "Unable to load available voices. Please check that the server is running."
        );
      } finally {
        setLoadingVoices(false);
      }
    };

    fetchVoices();
  }, [session]);

  // ==============================
  // AUDIO SETTINGS
  // ==============================

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.playbackRate = speed;
    }
  }, [volume, speed, audioUrl]);

  // ==============================
  // AUDIO CLEANUP
  // ==============================

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // ==============================
  // COUNTS
  // ==============================

  const wordCount = text.trim()
    ? text.trim().split(/\s+/).length
    : 0;

  // ==============================
  // HELPERS
  // ==============================

  const getLanguageName = (code) => {
    const language = languages.find((item) => item.code === code);

    return language ? language.name : code;
  };

  const getSelectedVoiceName = () => {
    const voice = voices.find(
      (item) => item.voiceId === selectedVoice
    );

    return voice ? voice.name : "Unknown voice";
  };

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    return new Date(date).toLocaleString();
  };

  const applyExtractedText = (extractedText, fileName) => {
    const cleanedText =
      extractedText?.replace(/\u0000/g, "").trim() || "";

    if (!cleanedText) {
      throw new Error(
        "No readable text was found in this document."
      );
    }

    setUploadedFileName(fileName);
    setTranslatedText("");

    if (cleanedText.length > MAX_CHARACTERS) {
      setText(cleanedText.slice(0, MAX_CHARACTERS));

      setError(
        `This document contains more than ${MAX_CHARACTERS} characters. Only the first ${MAX_CHARACTERS} characters were loaded.`
      );
    } else {
      setText(cleanedText);
      setError("");
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
    }
  };

  // ==============================
  // TXT EXTRACTION
  // ==============================

  const extractTextFromTxt = async (file) => {
    return await file.text();
  };

  // ==============================
  // DOCX EXTRACTION
  // ==============================

  const extractTextFromDocx = async (file) => {
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({
      arrayBuffer,
    });

    return result.value;
  };

  // ==============================
  // PDF EXTRACTION
  // ==============================

  const extractTextFromPdf = async (file) => {
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
    });

    const pdf = await loadingTask.promise;

    const pages = [];

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber += 1
    ) {
      const page = await pdf.getPage(pageNumber);

      const content = await page.getTextContent();

      const pageText = content.items
        .map((item) => item.str)
        .join(" ");

      pages.push(pageText);
    }

    return pages.join("\n\n");
  };

  // ==============================
  // DOCUMENT UPLOAD
  // ==============================

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setUploadedFileName("");
    setUploadingDocument(true);

    try {
      const lowerName = file.name.toLowerCase();

      let extractedText = "";

      if (lowerName.endsWith(".txt")) {
        extractedText = await extractTextFromTxt(file);
      } else if (lowerName.endsWith(".pdf")) {
        extractedText = await extractTextFromPdf(file);
      } else if (lowerName.endsWith(".docx")) {
        extractedText = await extractTextFromDocx(file);
      } else {
        throw new Error(
          "Unsupported file type. Please upload a TXT, PDF or DOCX file."
        );
      }

      applyExtractedText(extractedText, file.name);
    } catch (err) {
      console.error("Document upload error:", err);

      setUploadedFileName("");

      setError(
        err.message ||
          "Unable to read this document. Please try another file."
      );
    } finally {
      setUploadingDocument(false);
      event.target.value = "";
    }
  };

  // ==============================
  // UPLOAD AUDIO TO SUPABASE
  // ==============================

  const uploadAudio = async (audioBlob) => {
    if (!session?.user?.id) {
      throw new Error("You must be logged in to save audio.");
    }

    const fileName =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? `speech-${Date.now()}-${crypto.randomUUID()}.mp3`
        : `speech-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.mp3`;

    const audioPath = `${session.user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(audioPath, audioBlob, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    return audioPath;
  };

  // ==============================
  // SAVE HISTORY
  // ==============================

  const saveHistory = async (audioPath, finalTranslatedText) => {
    if (!session?.user?.id) {
      console.error(
        "Cannot save history: no authenticated user."
      );

      return false;
    }

    const voiceName = getSelectedVoiceName();

    const { data, error: insertError } = await supabase
      .from("speech_history")
      .insert({
        text: text.trim(),
        language: selectedLanguage,
        voice_id: selectedVoice,
        voice_name: voiceName,
        is_favorite: false,
        user_id: session.user.id,
        audio_path: audioPath,
        translated_text:
          finalTranslatedText && finalTranslatedText !== text.trim()
            ? finalTranslatedText
            : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("History save error:", insertError);

      return false;
    }

    setHistory((currentHistory) => [
      data,
      ...currentHistory,
    ]);

    return true;
  };

  // ==============================
  // FETCH HISTORY
  // ==============================

  const fetchHistory = async () => {
    if (!session?.user?.id) {
      return;
    }

    try {
      setLoadingHistory(true);
      setHistoryError("");

      const { data, error: fetchError } = await supabase
        .from("speech_history")
        .select(
          "id, created_at, text, translated_text, language, voice_id, voice_name, is_favorite, user_id, audio_path"
        )
        .order("created_at", {
          ascending: false,
        });

      if (fetchError) {
        throw fetchError;
      }

      setHistory(data || []);
    } catch (err) {
      console.error("History fetch error:", err);

      setHistoryError(
        "Unable to load your speech history."
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  // ==============================
  // FAVORITE / UNFAVORITE
  // ==============================

  const handleToggleFavorite = async (item) => {
    try {
      setUpdatingItemId(item.id);
      setHistoryError("");

      const newFavoriteValue = !item.is_favorite;

      const { data, error: updateError } = await supabase
        .from("speech_history")
        .update({
          is_favorite: newFavoriteValue,
        })
        .eq("id", item.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setHistory((currentHistory) =>
        currentHistory.map((historyItem) =>
          historyItem.id === item.id ? data : historyItem
        )
      );
    } catch (err) {
      console.error("Favorite update error:", err);

      setHistoryError(
        "Unable to update this favorite. Please try again."
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  // ==============================
  // PLAY HISTORY AUDIO
  // ==============================

  const handlePlayHistoryAudio = async (item) => {
    if (!item.audio_path) {
      setHistoryError(
        "Audio is unavailable for this older history item."
      );

      return;
    }

    try {
      setLoadingAudioId(item.id);
      setHistoryError("");

      const { data, error: downloadError } =
        await supabase.storage
          .from(AUDIO_BUCKET)
          .download(item.audio_path);

      if (downloadError) {
        throw downloadError;
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      const historyAudioUrl = URL.createObjectURL(data);

      setAudioUrl(historyAudioUrl);
      setActivePage("create");

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch((playError) => {
            console.error(
              "Audio playback error:",
              playError
            );
          });
        }
      }, 100);
    } catch (err) {
      console.error(
        "History audio playback error:",
        err
      );

      setHistoryError(
        "Unable to play this audio. Please try again."
      );
    } finally {
      setLoadingAudioId(null);
    }
  };

  // ==============================
  // DOWNLOAD HISTORY AUDIO
  // ==============================

  const handleDownloadHistoryAudio = async (item) => {
    if (!item.audio_path) {
      setHistoryError(
        "Audio is unavailable for this older history item."
      );

      return;
    }

    try {
      setLoadingAudioId(item.id);
      setHistoryError("");

      const { data, error: downloadError } =
        await supabase.storage
          .from(AUDIO_BUCKET)
          .download(item.audio_path);

      if (downloadError) {
        throw downloadError;
      }

      const downloadUrl = URL.createObjectURL(data);

      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = `vocalize-speech-${item.id}.mp3`;

      document.body.appendChild(link);

      link.click();
      link.remove();

      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(
        "History audio download error:",
        err
      );

      setHistoryError(
        "Unable to download this audio. Please try again."
      );
    } finally {
      setLoadingAudioId(null);
    }
  };

  // ==============================
  // DELETE HISTORY
  // ==============================

  const handleDeleteHistory = async (item) => {
    const confirmed = window.confirm(
      "Delete this speech history item? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingItemId(item.id);
      setHistoryError("");

      if (item.audio_path) {
        const { error: storageDeleteError } =
          await supabase.storage
            .from(AUDIO_BUCKET)
            .remove([item.audio_path]);

        if (storageDeleteError) {
          throw storageDeleteError;
        }
      }

      const { error: deleteError } = await supabase
        .from("speech_history")
        .delete()
        .eq("id", item.id);

      if (deleteError) {
        throw deleteError;
      }

      setHistory((currentHistory) =>
        currentHistory.filter(
          (historyItem) => historyItem.id !== item.id
        )
      );
    } catch (err) {
      console.error("Delete history error:", err);

      setHistoryError(
        "Unable to delete this history item. Please try again."
      );
    } finally {
      setDeletingItemId(null);
    }
  };

  // ==============================
  // NAVIGATION
  // ==============================

  const handlePageChange = async (page) => {
    setActivePage(page);
    setError("");
    setHistoryError("");

    if (page === "history" || page === "favorites") {
      await fetchHistory();
    }
  };

  // ==============================
  // LOGOUT
  // ==============================

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);

      const { error: logoutError } =
        await supabase.auth.signOut();

      if (logoutError) {
        throw logoutError;
      }

      setText("");
      setTranslatedText("");
      setUploadedFileName("");
      setError("");
      setHistory([]);
      setHistoryError("");
      setActivePage("create");

      setVoices([]);
      setSelectedVoice("");

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl("");
      }
    } catch (err) {
      console.error("Logout error:", err);

      setError(
        "Unable to log out. Please try again."
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  // ==============================
  // TEXT
  // ==============================

  const handleTextChange = (event) => {
    const value = event.target.value;

    if (value.length <= MAX_CHARACTERS) {
      setText(value);
      setTranslatedText("");
      setError("");

      if (uploadedFileName) {
        setUploadedFileName("");
      }
    }
  };

  // ==============================
  // CLEAR
  // ==============================

  const handleClear = () => {
    setText("");
    setTranslatedText("");
    setUploadedFileName("");
    setError("");

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
    }
  };

  // ==============================
  // LANGUAGE
  // ==============================

  const handleLanguageChange = (event) => {
    setSelectedLanguage(event.target.value);
    setTranslatedText("");
    setError("");

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
    }
  };

  // ==============================
  // VOICE
  // ==============================

  const handleVoiceChange = (event) => {
    setSelectedVoice(event.target.value);
    setError("");
  };

  // ==============================
  // RESET PLAYBACK
  // ==============================

  const handleResetSettings = () => {
    setSpeed(1);
    setVolume(1);

    if (audioRef.current) {
      audioRef.current.playbackRate = 1;
      audioRef.current.volume = 1;
    }
  };

  // ==============================
  // GENERATE SPEECH
  // ==============================

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError(
        "Please enter some text before generating speech."
      );

      return;
    }

    if (!selectedLanguage) {
      setError("Please select a language.");
      return;
    }

    if (!selectedVoice) {
      setError("Please select a voice.");
      return;
    }

    try {
      setError("");
      setGenerating(true);
      setTranslatedText("");

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl("");
      }

      let textForSpeech = text.trim();

      // Translate first when a non-English language is selected.
      if (selectedLanguage !== "en") {
        const translationResponse = await axios.post(
          `${API_URL}/api/translate`,
          {
            text: text.trim(),
            targetLanguage: selectedLanguage,
          }
        );

        if (
          !translationResponse.data?.success ||
          !translationResponse.data?.translatedText
        ) {
          throw new Error(
            "Translation failed. Please try again."
          );
        }

        textForSpeech =
          translationResponse.data.translatedText.trim();

        setTranslatedText(textForSpeech);
      }

      const response = await axios.post(
        `${API_URL}/api/tts`,
        {
          text: textForSpeech,
          language: selectedLanguage,
          voice: selectedVoice,
        },
        {
          responseType: "blob",
        }
      );

      const audioBlob = new Blob([response.data], {
        type: "audio/mpeg",
      });

      const newAudioUrl = URL.createObjectURL(audioBlob);

      setAudioUrl(newAudioUrl);

      let storedAudioPath = null;

      try {
        storedAudioPath = await uploadAudio(audioBlob);
      } catch (uploadError) {
        console.error("Audio upload error:", uploadError);

        setError(
          "Speech was generated, but the audio could not be saved to your library."
        );
      }

      const historySaved = await saveHistory(
        storedAudioPath,
        textForSpeech
      );

      if (!historySaved) {
        console.warn(
          "Speech was generated, but its history record was not saved."
        );
      }
    } catch (err) {
      console.error("Speech generation error:", err);

      let message =
        err.message ||
        "Speech generation failed. Please try again.";

      if (
        err.response?.data &&
        !(err.response.data instanceof Blob) &&
        err.response.data.message
      ) {
        message = err.response.data.message;
      }

      if (err.response?.data instanceof Blob) {
        try {
          const errorText = await err.response.data.text();
          const errorData = JSON.parse(errorText);

          if (errorData.message) {
            message = errorData.message;
          }
        } catch {
          // Keep current message
        }
      }

      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  // ==============================
  // HISTORY CARD
  // ==============================

  const renderHistoryItem = (item) => {
    const favoriteLoading = updatingItemId === item.id;
    const deleteLoading = deletingItemId === item.id;
    const audioLoading = loadingAudioId === item.id;

    return (
      <article className="history-item" key={item.id}>
        <div className="history-item-top">
          <div className="history-meta">
            <span className="history-language">
              {getLanguageName(item.language)}
            </span>

            <span>
              {item.voice_name || "Unknown voice"}
            </span>
          </div>

          <span className="history-date">
            {formatDate(item.created_at)}
          </span>
        </div>

        <p className="history-text">{item.text}</p>

        {item.translated_text && (
          <div className="translated-text-box">
            <strong>
              Translated text ({getLanguageName(item.language)})
            </strong>
            <p>{item.translated_text}</p>
          </div>
        )}

        {!item.audio_path && (
          <p className="audio-unavailable">
            Audio unavailable for this older generation.
          </p>
        )}

        <div className="history-actions">
          {item.audio_path && (
            <>
              <button
                type="button"
                className="favorite-button"
                disabled={audioLoading || deleteLoading}
                onClick={() =>
                  handlePlayHistoryAudio(item)
                }
              >
                {audioLoading
                  ? "Loading..."
                  : "▶ Play Audio"}
              </button>

              <button
                type="button"
                className="favorite-button"
                disabled={audioLoading || deleteLoading}
                onClick={() =>
                  handleDownloadHistoryAudio(item)
                }
              >
                ↓ Download MP3
              </button>
            </>
          )}

          <button
            type="button"
            className={
              item.is_favorite
                ? "favorite-button favorited"
                : "favorite-button"
            }
            disabled={
              favoriteLoading ||
              deleteLoading ||
              audioLoading
            }
            onClick={() => handleToggleFavorite(item)}
          >
            {favoriteLoading
              ? "Updating..."
              : item.is_favorite
              ? "♥ Favorited"
              : "♡ Add to Favorites"}
          </button>

          <button
            type="button"
            className="delete-history-button"
            disabled={
              deleteLoading ||
              favoriteLoading ||
              audioLoading
            }
            onClick={() => handleDeleteHistory(item)}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </article>
    );
  };

  // ==============================
  // SESSION LOADING
  // ==============================

  if (checkingSession) {
    return (
      <div className="app-loading">
        Loading Vocalize AI...
      </div>
    );
  }

  // ==============================
  // LOGIN
  // ==============================

  if (!session) {
    return <Auth />;
  }

  const favoriteHistory = history.filter(
    (item) => item.is_favorite
  );

  // ==============================
  // APP
  // ==============================

  return (
    <div className="app">
      {/* NAVBAR */}

      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">◖</div>

          <div>
            <h2>Vocalize AI</h2>
            <span>Text to Speech</span>
          </div>
        </div>

        <nav>
          <button
            className={
              activePage === "create"
                ? "nav-link active"
                : "nav-link"
            }
            type="button"
            onClick={() => handlePageChange("create")}
          >
            Create
          </button>

          <button
            className={
              activePage === "history"
                ? "nav-link active"
                : "nav-link"
            }
            type="button"
            onClick={() => handlePageChange("history")}
          >
            History
          </button>

          <button
            className={
              activePage === "favorites"
                ? "nav-link active"
                : "nav-link"
            }
            type="button"
            onClick={() => handlePageChange("favorites")}
          >
            Favorites
          </button>

          <button
            className="nav-link"
            type="button"
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            {logoutLoading ? "Logging out..." : "Logout"}
          </button>
        </nav>
      </header>

      {/* CREATE PAGE */}

      {activePage === "create" && (
        <main className="main-content">
          <section className="hero">
            <p className="eyebrow">AI POWERED SPEECH</p>

            <h1>
              Turn your words into
              <span> natural speech.</span>
            </h1>

            <p className="subtitle">
              Create realistic speech in multiple languages
              and voices.
            </p>
          </section>

          <section className="tts-card">
            <div className="section-heading">
              <div>
                <h3>Your text</h3>

                <p>
                  Type, paste or upload text you want to
                  convert.
                </p>
              </div>

              <button
                className="clear-button"
                onClick={handleClear}
                type="button"
              >
                Clear
              </button>
            </div>

            {/* DOCUMENT UPLOAD */}

            <div className="file-upload-section">
              <div className="file-upload-info">
                <strong>Upload a document</strong>

                <span>
                  Upload TXT, PDF or DOCX and we'll extract
                  its text automatically.
                </span>

                {uploadedFileName && (
                  <span className="uploaded-file-name">
                    ✓ {uploadedFileName}
                  </span>
                )}
              </div>

              <label className="file-upload-button">
                {uploadingDocument
                  ? "Reading..."
                  : "Choose File"}

                <input
                  type="file"
                  accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileUpload}
                  disabled={uploadingDocument}
                  hidden
                />
              </label>
            </div>

            <textarea
              placeholder="Start typing, paste text, or upload a document..."
              value={text}
              onChange={handleTextChange}
              maxLength={MAX_CHARACTERS}
            />

            <div className="text-stats">
              <span>
                {wordCount}{" "}
                {wordCount === 1 ? "word" : "words"}
              </span>

              <span>
                {text.length} / {MAX_CHARACTERS} characters
              </span>
            </div>

            {error && (
              <div className="error-message">{error}</div>
            )}

            <div className="selectors">
              <div className="field">
                <label htmlFor="language">Language</label>

                <select
                  id="language"
                  value={selectedLanguage}
                  onChange={handleLanguageChange}
                >
                  {languages.map((language) => (
                    <option
                      key={language.code}
                      value={language.code}
                    >
                      {language.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="voice">Voice</label>

                <select
                  id="voice"
                  value={selectedVoice}
                  onChange={handleVoiceChange}
                  disabled={
                    loadingVoices || voices.length === 0
                  }
                >
                  {loadingVoices ? (
                    <option value="">
                      Loading voices...
                    </option>
                  ) : voices.length === 0 ? (
                    <option value="">
                      No voices available
                    </option>
                  ) : (
                    voices.map((voice) => (
                      <option
                        key={voice.voiceId}
                        value={voice.voiceId}
                      >
                        {voice.name}
                        {voice.labels?.gender
                          ? ` — ${voice.labels.gender}`
                          : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {translatedText && selectedLanguage !== "en" && (
              <div className="translated-text-box">
                <strong>
                  Translated text ({getLanguageName(selectedLanguage)})
                </strong>

                <p>{translatedText}</p>
              </div>
            )}

            {/* PLAYBACK SETTINGS */}

            <div className="voice-settings">
              <div className="settings-header">
                <div>
                  <h3>Playback Settings</h3>

                  <p>
                    Adjust speed and volume without
                    regenerating your speech.
                  </p>
                </div>

                <button
                  className="reset-settings"
                  type="button"
                  onClick={handleResetSettings}
                >
                  Reset
                </button>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <label htmlFor="speed">
                    Playback Speed
                  </label>

                  <span>{Number(speed).toFixed(1)}×</span>
                </div>

                <input
                  id="speed"
                  type="range"
                  min="0.7"
                  max="3"
                  step="0.1"
                  value={speed}
                  onChange={(event) =>
                    setSpeed(Number(event.target.value))
                  }
                />

                <div className="range-labels">
                  <span>0.7×</span>
                  <span>1.0×</span>
                  <span>2.0×</span>
                  <span>3.0×</span>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <label htmlFor="volume">
                    Playback Volume
                  </label>

                  <span>{Math.round(volume * 100)}%</span>
                </div>

                <input
                  id="volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(event) =>
                    setVolume(Number(event.target.value))
                  }
                />

                <div className="range-labels">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <button
              className="generate-button"
              onClick={handleGenerate}
              type="button"
              disabled={
                generating ||
                loadingVoices ||
                uploadingDocument
              }
            >
              {generating
                ? "Generating Speech..."
                : "Generate Speech"}
            </button>

            {audioUrl && (
              <div className="audio-section">
                <div className="audio-heading">
                  <div>
                    <h3>Your audio</h3>

                    <p>
                      Your speech has been generated
                      successfully.
                    </p>
                  </div>

                  <span className="success-badge">
                    Ready
                  </span>
                </div>

                <audio
                  ref={audioRef}
                  controls
                  src={audioUrl}
                  className="audio-player"
                >
                  Your browser does not support audio
                  playback.
                </audio>

                <div className="current-playback-settings">
                  <span>
                    Speed:{" "}
                    <strong>
                      {Number(speed).toFixed(1)}×
                    </strong>
                  </span>

                  <span>
                    Volume:{" "}
                    <strong>
                      {Math.round(volume * 100)}%
                    </strong>
                  </span>
                </div>

                <a
                  href={audioUrl}
                  download="vocalize-speech.mp3"
                  className="download-button"
                >
                  Download MP3
                </a>
              </div>
            )}
          </section>
        </main>
      )}

      {/* HISTORY PAGE */}

      {activePage === "history" && (
        <main className="main-content">
          <section className="hero">
            <p className="eyebrow">YOUR LIBRARY</p>

            <h1>
              Speech
              <span> history.</span>
            </h1>

            <p className="subtitle">
              View, favorite and manage your generated
              speech.
            </p>
          </section>

          <section className="tts-card">
            <div className="section-heading">
              <div>
                <h3>Recent generations</h3>

                <p>Your newest speech appears first.</p>
              </div>

              <button
                className="clear-button"
                type="button"
                onClick={fetchHistory}
                disabled={loadingHistory}
              >
                {loadingHistory
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            </div>

            {historyError && (
              <div className="error-message">
                {historyError}
              </div>
            )}

            {loadingHistory ? (
              <div className="history-state">
                Loading your history...
              </div>
            ) : history.length === 0 ? (
              <div className="history-state">
                <h3>No speech history yet</h3>

                <p>
                  Generate your first speech and it will
                  appear here.
                </p>

                <button
                  className="generate-button history-create-button"
                  type="button"
                  onClick={() => handlePageChange("create")}
                >
                  Create Speech
                </button>
              </div>
            ) : (
              <div className="history-list">
                {history.map(renderHistoryItem)}
              </div>
            )}
          </section>
        </main>
      )}

      {/* FAVORITES PAGE */}

      {activePage === "favorites" && (
        <main className="main-content">
          <section className="hero">
            <p className="eyebrow">YOUR LIBRARY</p>

            <h1>
              Your
              <span> favorites.</span>
            </h1>

            <p className="subtitle">
              Keep your most useful speech generations
              together.
            </p>
          </section>

          <section className="tts-card">
            <div className="section-heading">
              <div>
                <h3>Favorite speech</h3>

                <p>
                  Speech you've marked as a favorite appears
                  here.
                </p>
              </div>

              <button
                className="clear-button"
                type="button"
                onClick={fetchHistory}
                disabled={loadingHistory}
              >
                {loadingHistory
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            </div>

            {historyError && (
              <div className="error-message">
                {historyError}
              </div>
            )}

            {loadingHistory ? (
              <div className="history-state">
                Loading your favorites...
              </div>
            ) : favoriteHistory.length === 0 ? (
              <div className="history-state">
                <div className="empty-heart">♡</div>

                <h3>No favorites yet</h3>

                <p>
                  Open History and select "Add to Favorites"
                  on a speech generation you want to save.
                </p>

                <button
                  className="generate-button history-create-button"
                  type="button"
                  onClick={() => handlePageChange("history")}
                >
                  View History
                </button>
              </div>
            ) : (
              <div className="history-list">
                {favoriteHistory.map(renderHistoryItem)}
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  );
}

export default App;