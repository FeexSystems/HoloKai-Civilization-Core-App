import sys

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    content = f.read()

# Find the chat bar mic button area
start_marker = 'flex gap-2 sm:gap-3">'
end_marker = '<Mic size={20} />\n                </button>'

idx_start = content.find(start_marker)
idx_end = content.find(end_marker, idx_start) + len(end_marker)

if idx_start >= 0 and idx_end > idx_start:
    old_block = content[idx_start:idx_end]
    print("Original block repr:")
    print(repr(old_block))

    new_block = '''flex gap-2 sm:gap-3">
                <button
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

    content = content[:idx_start] + new_block + content[idx_end:]
    print('OK - mic button in chat bar replaced')

with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.write(content)
