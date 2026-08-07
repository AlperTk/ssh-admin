WritePatternDetector.detect() dönüş formatı:
{ ok: boolean; debug?: { rule: string; text: string } }

ok: true = write tespit edildi (engellenecek)
ok: false = write yok (izin verilecek)
debug.rule = eşleşen kural adı
debug.text = eşleşen metin