from utils.chord_converter import absolute_to_nashville

def test_absolute_to_nashville():
    assert absolute_to_nashville("F#m D Bm", "A") == "6m 4 2m"
    assert absolute_to_nashville("A E Bm F#m", "A") == "1 5 2m 6m"
    assert absolute_to_nashville("C G Am F", "C") == "1 5 6m 4"
    assert absolute_to_nashville("G D Em C", "G") == "1 5 6m 4"
    assert absolute_to_nashville("F#m.D.Bm", "A") == "6m 4 2m"
    assert absolute_to_nashville("F#m.D.C#m.E", "A") == "6m 4 3m 5"
    assert absolute_to_nashville("Eb Bb Cm Ab", "Eb") == "1 5 6m 4"
    
def test_non_diatonic():
    assert absolute_to_nashville("A C D", "A") == "1 b3 4"
    assert absolute_to_nashville("C Eb F", "C") == "1 b3 4"
