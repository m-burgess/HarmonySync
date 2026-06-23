import sys
import collections
import numpy as np
try:
    import collections.abc
    collections.MutableSequence = collections.abc.MutableSequence
    collections.MutableMapping = collections.abc.MutableMapping
except AttributeError:
    pass
np.float = np.float64
np.int = int
np.complex = complex
sys.path.append("/home/mike-burgess/RustPresenter/apps/python-song-processor")
from madmom.features.chords import CNNChordFeatureProcessor, CRFChordRecognitionProcessor
import librosa

audio_path = "/home/mike-burgess/Downloads/Come Alive - A/Honor & Glory - Come Alive  (Official Live Video).mp3"

feat_processor = CNNChordFeatureProcessor(num_threads=1)
decode_processor = CRFChordRecognitionProcessor(num_threads=1)

features = feat_processor(audio_path)
chords_output = decode_processor(features)

for start, end, label in chords_output[:20]:
    print(f"{start} - {end}: {label}")
