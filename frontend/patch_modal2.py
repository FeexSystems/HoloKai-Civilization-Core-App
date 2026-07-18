import sys

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    content = f.read()

# Update mic button in chat bar
old_mic = '''                  <button
                    type="button"
                    onClick={startVoiceInput}
                    className={`p-3.5 rounded-2xl border transition ${
                      listening
                        ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                        : 'hover:bg-white/10 border-transparent text-white/60'
                    }`}
                    title="Voice input"
                  >
                    <Mic size={20} />
                  </button>'''

new_mic = '''                  <button
                    type="button"
                    onClick={startVoiceInput}
                    className={`p-3.5 rounded-2xl border transition ${
                      whisper.processing
                        ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                        : listening
                          ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                          : 'hover:bg-white/10 border-transparent text-white/60'
                    }`}
                    title="Voice input"
                  >
                    {whisper.processing ? <Loader size={20} className="animate-spin" /> : <Mic size={20} />}
                  </button>'''

if old_mic in content:
    content = content.replace(old_mic, new_mic, 1)
    print('OK - mic button replaced')
else:
    print('FAIL - old mic not found')
    idx = content.find('onClick={startVoiceInput}')
    if idx >= 0:
        print('Found at', idx)
        print(repr(content[idx-40:idx+500]))

with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.write(content)
