import numpy as np

from model import NLUModel


def test_get_model_info_not_loaded():
    model = NLUModel()
    info = model.get_model_info()
    assert info["status"] == "not_loaded"
    assert "model_name" in info


def test_detect_subcategory_cardiac():
    model = NLUModel()
    result = model._detect_subcategory("Severe chest pain with diaphoresis", np.zeros(7))
    assert result in ("cardiac", "unknown")


def test_detect_subcategory_neurological():
    model = NLUModel()
    result = model._detect_subcategory("Facial droop and slurred speech", np.zeros(7))
    assert result in ("neurological", "unknown")


def test_detect_subcategory_unknown():
    model = NLUModel()
    result = model._detect_subcategory("Non-specific complaint", np.zeros(7))
    assert result in ("unknown", None)


def test_extract_key_terms_placeholder():
    model = NLUModel()
    result = model._extract_key_terms("Some clinical text", "general_query")
    assert isinstance(result, list)
    assert result == []
