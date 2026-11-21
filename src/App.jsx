import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines, Disc3, Heart, Home, Library, ListMusic, Music2,
  Pause, Play, Plus, Search, Settings2, SkipBack, SkipForward,
  Sparkles, Upload, Volume2, VolumeX, X, Youtube, Clock3,
  ChevronDown, ExternalLink, Radio, SlidersHorizontal
} from "lucide-react";

const DB_NAME = "y2k-radio-library";
const STORE_NAME = "tracks";
const FAVOURITES_KEY = "y2k-radio-favourites";

function openLibrary() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveTrack(track) {
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(track);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

async function readTracks() {
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => { db.close(); resolve(request.result || []); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

async function removeTrack(id) {
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return minutes + ":" + remainder;
}

function App() {
  const [tracks, setTracks] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [query, setQuery] = useState("");
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [activeView, setActiveView] = useState("home");
  const [favourites, setFavourites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAVOURITES_KEY) || "[]"); }
    catch { return []; }
  });
  const [queue, setQueue] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");
  const [youtubeVideo, setYoutubeVideo] = useState(null);
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubePlaying, setYoutubePlaying] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const artwork = activeTrack?.artwork || "";

  useEffect(() => {
    readTracks().then(setTracks).catch(() => setNotice("Your browser couldn't open the music library."));
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
  }, [favourites]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    const url = URL.createObjectURL(activeTrack.file);
    audio.src = url;
    audio.volume = muted ? 0 : volume;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    return () => URL.revokeObjectURL(url);
  }, [activeTrack?.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    if (!youtubeVideo) return;
    const frame = document.querySelector(".youtube-dock iframe");
    frame?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: youtubePlaying ? "playVideo" : "pauseVideo", args: [] }),
      "https://www.youtube-nocookie.com"
    );
  }, [youtubePlaying, youtubeVideo]);

  const visibleTracks = useMemo(() => {
    if (activeView === "favourites") return tracks.filter((track) => favourites.includes(track.id));
    if (activeView === "recent") return tracks;
    return tracks;
  }, [tracks, favourites, activeView]);

  const toggleFavourite = (id) => {
    setFavourites((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  };

  const importFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    const audioFiles = files.filter((file) => file.type.startsWith("audio/") || /\.(mp3|flac|wav|m4a|ogg|aac)$/i.test(file.name));
    if (!audioFiles.length) {
      setNotice("Choose an audio file to add it to your library.");
      return;
    }
    const imported = audioFiles.map((file) => ({
      id: crypto.randomUUID(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Your library",
      album: "Local files",
      artwork: "",
      file,
      addedAt: Date.now()
    }));
    try {
      for (const track of imported) await saveTrack(track);
      const updated = await readTracks();
      setTracks(updated);
      setNotice(imported.length === 1 ? "Added to your library." : imported.length + " tracks added to your library.");
    } catch {
      setNotice("Couldn't save those files. Check your browser's available storage.");
    }
    event.target.value = "";
  };

  const playTrack = (track) => {
    setYoutubeVideo(null);
    setYoutubePlaying(false);
    setActiveTrack(track);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(true);
    setQueue((current) => current.length ? current : tracks.filter((item) => item.id !== track.id));
  };

  const playNext = () => {
    if (!queue.length) {
      setPlaying(false);
      return;
    }
    const [next, ...rest] = queue;
    setQueue(rest);
    playTrack(next);
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    if (audio.paused) {
      try { await audio.play(); setPlaying(true); }
      catch { setNotice("This track couldn't be played. Try importing it again."); }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const searchYouTube = async (event, searchTerm = query) => {
    event?.preventDefault();
    if (!searchTerm.trim()) return;
    setQuery(searchTerm);
    setSearching(true);
    setYoutubeResults([]);
    try {
      const params = new URLSearchParams({ q: searchTerm.trim() });
      const response = await fetch("/api/youtube-search?" + params);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "YouTube search failed.");
      setYoutubeResults((data.items || []).map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        artwork: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || "",
        publishedAt: item.snippet.publishedAt
      })));
      setActiveView("search");
    } catch (error) {
      setNotice(error.message || "Couldn't search YouTube.");
    } finally {
      setSearching(false);
    }
  };

  const playYouTube = (video) => {
    if (activeTrack && audioRef.current) audioRef.current.pause();
    setActiveTrack(null);
    setYoutubeVideo(video.id);
    setYoutubeTitle(video.title);
    setYoutubePlaying(true);
    setPlaying(false);
  };

  const deleteLocalTrack = async (track) => {
    await removeTrack(track.id);
    const updated = await readTracks();
    setTracks(updated);
    setFavourites((current) => current.filter((id) => id !== track.id));
    if (activeTrack?.id === track.id) {
      audioRef.current?.pause();
      setActiveTrack(null);
      setPlaying(false);
    }
    setNotice("Removed from your library.");
  };

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "library", label: "My library", icon: Library },
    { id: "favourites", label: "Liked songs", icon: Heart },
    { id: "recent", label: "Recently added", icon: Clock3 }
  ];

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <audio
        ref={audioRef}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={playNext}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <header className="topbar">
        <button className="brand" onClick={() => setActiveView("home")} aria-label="Y2K Radio home">
          <span className="brand-mark"><Disc3 size={23} /></span>
          <span>y2k<span className="brand-light">radio</span><i>®</i></span>
        </button>
        <form className="search-box" onSubmit={searchYouTube}>
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search songs, artists, albums..." aria-label="Search YouTube music" />
          <span className="search-hint">↵</span>
        </form>
        <div className="top-actions">
          <span className="status-pill"><span /> YOUR LITTLE MUSIC WORLD</span>
          <button className="icon-button settings-button" onClick={() => setShowSettings(true)} aria-label="Settings"><Settings2 size={19} /></button>
          <button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu"><SlidersHorizontal size={19} /></button>
        </div>
      </header>

      <div className="main-layout">
        <aside className={"sidebar " + (mobileMenu ? "sidebar-open" : "")}>
          <div className="sidebar-label">YOUR SPACE</div>
          <nav>
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} className={"nav-item " + (activeView === id ? "active" : "")} onClick={() => { setActiveView(id); setMobileMenu(false); }}>
                <Icon size={17} strokeWidth={1.8} /> {label}
                {id === "favourites" && favourites.length > 0 && <span className="nav-count">{favourites.length}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-rule" />
          <div className="sidebar-label">YOUR COLLECTION</div>
          <div className="collection-card">
            <div className="collection-art"><Disc3 size={29} /></div>
            <div><strong>Local library</strong><span>{tracks.length} {tracks.length === 1 ? "track" : "tracks"}</span></div>
            <button onClick={() => fileInputRef.current?.click()} aria-label="Add music"><Plus size={17} /></button>
          </div>
          <div className="sidebar-note">
            <Sparkles size={15} />
            <span>Good music, good mood. That's the whole thing.</span>
          </div>
          <div className="sidebar-bottom"><span className="tiny-disc"><Disc3 size={15} /></span> EST. 2004 · PLAY IT LOUD</div>
        </aside>

        <main className="content">
          <section className="hero-card">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-star">✳</span> A LITTLE NOSTALGIA NEVER HURT</div>
              <h1>Your music.<br /><em>Your</em> universe.</h1>
              <p>A shiny little place for all the songs that make life feel like a movie.</p>
              <div className="hero-buttons">
                <button className="primary-button" onClick={() => fileInputRef.current?.click()}><Upload size={16} /> Add your music</button>
                <button className="secondary-button" onClick={() => setShowSettings(true)}><Youtube size={16} /> Connect YouTube</button>
              </div>
              <div className="hero-footnote"><span className="pulse-dot" /> YOUR PERSONAL SOUNDTRACK STARTS HERE</div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="sparkle sparkle-a">✦</div><div className="sparkle sparkle-b">✧</div><div className="sparkle sparkle-c">✳</div>
              <div className="cd-disc"><div className="cd-shine" /><div className="cd-center"><span>Y2K</span><small>RADIO</small></div></div>
              <div className="cd-caption">SIDE A <span>♡</span> ALL THE FEELS</div>
              <div className="floating-chip chip-top">PLAY YOUR WAY</div>
              <div className="floating-chip chip-bottom">VOL. 001 — 2004</div>
            </div>
          </section>

          <section className="quick-stats">
            <div><span className="stat-icon"><Music2 size={16} /></span><span><strong>{tracks.length}</strong><small>IN YOUR LIBRARY</small></span></div>
            <div><span className="stat-icon"><Heart size={16} /></span><span><strong>{favourites.length}</strong><small>FAVOURITES</small></span></div>
            <div><span className="stat-icon"><ListMusic size={16} /></span><span><strong>{queue.length}</strong><small>UP NEXT</small></span></div>
            <div className="stat-message">made for the <b>love</b> of music <span>♡</span></div>
          </section>

          {activeView === "home" && (
            <section className="browse-section">
              <div className="section-heading browse-heading">
                <div><div className="eyebrow muted-eyebrow">PICK A MOOD</div><h2>Explore the music library</h2></div>
                <span className="browse-caption">CURATED STARTING POINTS ♡</span>
              </div>
              <div className="collection-grid">
                {[
                  { title: "Hindi hits", detail: "Bollywood favourites", query: "Hindi Bollywood hit songs official music" , tone: "rose", mark: "हिंदी" },
                  { title: "English pop", detail: "Big pop energy", query: "popular English pop songs official music", tone: "lilac", mark: "POP" },
                  { title: "2000s throwbacks", detail: "Back to the good old days", query: "2000s hit songs official music", tone: "silver", mark: "Y2K" },
                  { title: "Love songs", detail: "For the soft hours", query: "romantic Hindi and English songs official music", tone: "peach", mark: "♡" },
                  { title: "Indie & chill", detail: "Easy listening, all day", query: "indie chill songs official music", tone: "blue", mark: "INDIE" },
                  { title: "Feel-good mix", detail: "Instant mood lift", query: "feel good upbeat songs official music", tone: "gold", mark: "✳" }
                ].map((mix) => (
                  <button className="mix-card" key={mix.title} onClick={() => searchYouTube(null, mix.query)}>
                    <span className={"mix-art mix-" + mix.tone}><span>{mix.mark}</span><i>♫</i></span>
                    <span className="mix-copy"><strong>{mix.title}</strong><small>{mix.detail}</small></span>
                    <span className="mix-arrow"><Play size={15} fill="currentColor" /></span>
                  </button>
                ))}
              </div>
              <p className="browse-footnote">Choose a collection to discover music. Search is provided by Y2K Radio.</p>
            </section>
          )}

          <section className="library-section">
            <div className="section-heading">
              <div><div className="eyebrow muted-eyebrow">THE GOOD STUFF</div><h2>{activeView === "favourites" ? "Your favourites" : activeView === "recent" ? "Recently added" : activeView === "search" ? "Search results" : activeView === "library" ? "Your library" : "On your playlist"}</h2></div>
              <div className="section-actions">
                <button className="text-button" onClick={() => fileInputRef.current?.click()}><Plus size={15} /> Add tracks</button>
                <button className="round-button" onClick={() => setActiveView("library")} aria-label="View library"><ExternalLink size={15} /></button>
              </div>
            </div>

            {activeView === "search" && youtubeResults.length > 0 ? (
              <div className="track-list">
                {youtubeResults.map((track, index) => (
                  <div className="track-row" key={track.id}>
                    <span className="track-number">{String(index + 1).padStart(2, "0")}</span>
                    <button className="track-art youtube-art" onClick={() => playYouTube(track)}>{track.artwork ? <img src={track.artwork} alt="" /> : <Youtube size={19} />}<span><Play size={13} fill="currentColor" /></span></button>
                    <button className="track-info" onClick={() => playYouTube(track)}><strong>{track.title}</strong><small>{track.artist}</small></button>
                    <span className="source-tag">YOUTUBE</span>
                    <button className="row-play" onClick={() => playYouTube(track)} aria-label={"Play " + track.title}><Play size={16} /></button>
                  </div>
                ))}
              </div>
            ) : visibleTracks.length > 0 ? (
              <div className="track-list">
                {visibleTracks.map((track, index) => (
                  <div className={"track-row " + (activeTrack?.id === track.id ? "is-current" : "")} key={track.id}>
                    <span className="track-number">{String(index + 1).padStart(2, "0")}</span>
                    <button className="track-art" onClick={() => playTrack(track)}><span className="art-placeholder"><Disc3 size={20} /></span><span className="art-play"><Play size={13} fill="currentColor" /></span></button>
                    <button className="track-info" onClick={() => playTrack(track)}><strong>{track.title}</strong><small>{track.artist}</small></button>
                    <span className="source-tag">LOCAL FILE</span>
                    <button className={"row-heart " + (favourites.includes(track.id) ? "liked" : "")} onClick={() => toggleFavourite(track.id)} aria-label="Toggle favourite"><Heart size={16} fill={favourites.includes(track.id) ? "currentColor" : "none"} /></button>
                    <button className="row-play" onClick={() => playTrack(track)} aria-label={"Play " + track.title}><Play size={16} /></button>
                    <button className="row-delete" onClick={() => deleteLocalTrack(track)} aria-label={"Remove " + track.title}><X size={15} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-record"><Disc3 size={33} /></div>
                <h3>{activeView === "favourites" ? "Nothing loved just yet." : "Your next favourite is waiting."}</h3>
                <p>Add music from your device, or search YouTube to find something to play.</p>
                <div className="empty-actions"><button className="primary-button" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Choose audio files</button><button className="secondary-button" onClick={() => setShowSettings(true)}><Youtube size={15} /> Set up YouTube</button></div>
              </div>
            )}
          </section>

          <section className="bottom-note">
            <span>✳</span> A little corner of the internet, just for your music. <span className="note-right">KEEP IT ON REPEAT ♡</span>
          </section>
        </main>
      </div>

      <div className={"player-bar " + (activeTrack || youtubeVideo ? "player-active" : "")}>
        <div className="now-playing">
          <div className="mini-art">{youtubeVideo ? <Youtube size={20} /> : activeTrack ? <Disc3 size={21} /> : <Music2 size={20} />}</div>
          <div className="now-copy"><strong>{youtubeVideo ? youtubeTitle : activeTrack?.title || "Nothing playing yet"}</strong><small>{youtubeVideo ? "YouTube" : activeTrack?.artist || "Pick a song to get started"}</small></div>
          {activeTrack && <button className={"player-heart " + (favourites.includes(activeTrack.id) ? "liked" : "")} onClick={() => toggleFavourite(activeTrack.id)} aria-label="Like track"><Heart size={17} fill={favourites.includes(activeTrack.id) ? "currentColor" : "none"} /></button>}
        </div>
        <div className="player-controls">
          <div className="control-buttons">
            <button className="control-icon" onClick={() => { if (activeTrack) audioRef.current.currentTime = 0; }} aria-label="Restart"><SkipBack size={17} /></button>
            <button className="main-play" onClick={youtubeVideo ? () => setYoutubePlaying(!youtubePlaying) : togglePlayback} aria-label={playing || youtubePlaying ? "Pause" : "Play"} disabled={!activeTrack && !youtubeVideo}>{playing || youtubePlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
            <button className="control-icon" onClick={playNext} aria-label="Next track"><SkipForward size={17} /></button>
          </div>
          <div className="progress-row">
            <span>{formatTime(currentTime)}</span>
            <input type="range" min="0" max={duration || 100} value={Math.min(currentTime, duration || 100)} onChange={(event) => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value); }} aria-label="Track progress" />
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="player-extra">
          <button className="control-icon volume-toggle" onClick={() => setMuted(!muted)} aria-label="Toggle mute">{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <input className="volume-slider" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume" />
          <button className="control-icon queue-button" onClick={() => setActiveView("library")} aria-label="Open library"><ListMusic size={19} /></button>
        </div>
      </div>

      {youtubeVideo && (
        <div className="youtube-dock">
          <div className="youtube-dock-copy"><Youtube size={16} /><span>Playing through YouTube's official player</span></div>
          <iframe
            title="YouTube music player"
            src={"https://www.youtube-nocookie.com/embed/" + youtubeVideo + "?autoplay=1&controls=1&rel=0&enablejsapi=1&origin=" + encodeURIComponent(window.location.origin)}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          <button onClick={() => { setYoutubeVideo(null); setYoutubePlaying(false); }} aria-label="Close YouTube player"><X size={17} /></button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.aac" multiple hidden onChange={importFiles} />

      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={14} /></button></div>}

      {showSettings && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSettings(false); }}>
          <section className="settings-modal">
            <div className="modal-heading"><div><span className="eyebrow muted-eyebrow">MAKE IT YOURS</span><h2>Little settings</h2></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={19} /></button></div>
            <div className="settings-block">
              <div className="settings-title"><Youtube size={18} /><div><strong>YouTube search</strong><small>Find music using the official YouTube Data API.</small></div></div>
              <p className="settings-help">YouTube search is connected by the site owner. You do not need to add an API key on this device.</p>
              <p className="settings-help">Playback uses YouTube’s official embedded player, so YouTube controls ads and availability.</p>
            </div>
            <div className="settings-block settings-warning"><Sparkles size={17} /><p>YouTube playback uses its official embedded player. YouTube controls ads, playback availability and regional restrictions.</p></div>
            <div className="modal-footer"><span>Y2K RADIO · VOL. 001</span><button className="primary-button" onClick={() => setShowSettings(false)}>All done <span>♡</span></button></div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
