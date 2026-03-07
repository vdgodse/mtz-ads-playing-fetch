export function isSpeechSynthesisSupported(): boolean {
  return "speechSynthesis" in window;
}

export function speakLetter(letter: string): void {
  if (!isSpeechSynthesisSupported()) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(letter);
  utterance.rate = 1;
  utterance.pitch = 1.02;
  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech(): void {
  window.speechSynthesis?.cancel();
}
