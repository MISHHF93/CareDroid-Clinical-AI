from utils import hash_text, truncate_text, split_into_chunks, normalize_text


def test_hash_text_stable():
    assert hash_text("abc") == hash_text("abc")


def test_truncate_text():
    text = "a" * 10
    assert truncate_text(text, max_length=5).startswith("aaaaa")


def test_split_into_chunks():
    text = "word " * 200
    chunks = split_into_chunks(text, chunk_size=50, overlap=10)
    assert len(chunks) > 1


def test_normalize_text():
    text = "  hello   world  "
    assert normalize_text(text) == "hello world"
