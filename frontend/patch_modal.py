import sys

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    content = f.read()

# --- Replace TTS controls ---
old_tts = '''                {/* TTS controls */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-white/70">Auto-speak replies</span>
                    <button
                      type="button"
                      onClick={() => tts.setAutoSpeak(!tts.autoSpeak)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        tts.autoSpeak
                          ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                          : 'bg-white/5 border-white/10 text-white/50'
                      }`}
                    >
                      {tts.autoSpeak ? 'On' : 'Off'}
                    </button>
                  </div>
                  <label className="block text-[11px] text-white/50">
                    Voice
                    <select
                      value={tts.voiceURI}
                      onChange={(e) => tts.setVoiceURI(e.target.value)}
                      className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      {tts.voices.length === 0 && <option value="">Default system voice</option>}
                      {tts.voices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="text-[11px] text-white/50">
                      Rate {tts.rate.toFixed(2)}
                      <input
                        type="range"
                        min="0.6"
                        max="1.4"
                        step="0.05"
                        value={tts.rate}
                        onChange={(e) => tts.setRate(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </label>
                    <label className="text-[11px] text-white/50">
                      Pitch {tts.pitch.toFixed(2)}
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={tts.pitch}
                        onChange={(e) => tts.setPitch(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </label>
                    <label className="text-[11px] text-white/50">
                      Volume {Math.round(tts.volume * 100)}%
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={tts.volume}
                        onChange={(e) => tts.setVolume(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </label>
                  </div>
                </div>'''

new_tts = '''                {/* TTS controls */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-white/70">Auto-speak replies</span>
                    <button
                      type="button"
                      onClick={() => tts.setAutoSpeak(!tts.autoSpeak)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        tts.autoSpeak
                          ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                          : 'bg-white/5 border-white/10 text-white/50'
                      }`}
                    >
                      {tts.autoSpeak ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-white/70">Neural voice (edge-tts)</span>
                    <button
                      type="button"
                      onClick={() => tts.setUseBackendVoice(!tts.useBackendVoice)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        tts.useBackendVoice
                          ? 'bg-purple-500/20 border-purple-400/40 text-purple-200'
                          : 'bg-white/5 border-white/10 text-white/50'
                      }`}
                    >
                      {tts.useBackendVoice ? 'On' : 'Off'}
                    </button>
                  </div>
                  <label className="block text-[11px] text-white/50">
                    {tts.useBackendVoice ? 'Neural Voice' : 'Browser Voice'}
                    <select
                      value={tts.useBackendVoice ? tts.backendVoiceURI : tts.voiceURI}
                      onChange={(e) => {
                        if (tts.useBackendVoice) tts.setBackendVoiceURI(e.target.value)
                        else tts.setVoiceURI(e.target.value)
                      }}
                      className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      {tts.useBackendVoice ? (
                        tts.EDGE_TTS_VOICES.map((v) => (
                          <option key={v.uri} value={v.uri}>{v.label}</option>
                        ))
                      ) : (
                        <>
                          {tts.voices.length === 0 && <option value="">Default system voice</option>}
                          {tts.voices.map((v) => (
                            <option key={v.voiceURI} value={v.voiceURI}>
                              {v.name} ({v.lang})
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="text-[11px] text-white/50">
                      Rate {tts.rate.toFixed(2)}
                      <input
                        type="range"
                        min="0.6"
                        max="1.4"
                        step="0.05"
                        value={tts.rate}
                        onChange={(e) => tts.setRate(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </label>
                    <label className="text-[11px] text-white/50">
                      Pitch {tts.pitch.toFixed(2)}
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={tts.pitch}
                        onChange={(e) => tts.setPitch(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </label>
                    <label className="text-[11px] text-white/50">
                      Volume {Math.round(tts.volume * 100)}%
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={tts.volume}
                        onChange={(e) => tts.setVolume(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </label>
                  </div>
                </div>'''

if old_tts in content:
    content = content.replace(old_tts, new_tts, 1)
    print('OK - TTS controls replaced')
else:
    print('FAIL - old TTS controls not found')
    import re
    # Fuzzy search for the Voice select
    match = re.search(r'<label className="block text-\[11px\] text-white/50">\s*\n\s*Voice', content)
    if match:
        print('Voice select found at', match.start())
    else:
        print('Voice select not found in file')

with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.write(content)
