import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createReportApi } from '../../api/reports';
import FieldHeader from '../../components/FieldHeader';

const URGENCY_CHOICES = [
  {
    value: 'LOW',
    label: 'Low',
    level: 1,
    pips: [true, false, false, false],
    desc: 'Animal is in a safe spot, non-severe injury, minor illness',
    colorText: 'text-emerald-950',
    colorBorder: 'border-emerald-300',
    colorBg: 'bg-emerald-50/60',
  },
  {
    value: 'MEDIUM',
    label: 'Medium',
    level: 2,
    pips: [true, true, false, false],
    desc: 'Limping, moderate distress, dehydrated, vulnerable location',
    colorText: 'text-amber-950',
    colorBorder: 'border-amber-300',
    colorBg: 'bg-amber-50/60',
  },
  {
    value: 'HIGH',
    label: 'High',
    level: 3,
    pips: [true, true, true, false],
    desc: 'Fracture, deep bleeding, trapped, roadside traffic risk',
    colorText: 'text-orange-950',
    colorBorder: 'border-orange-400',
    colorBg: 'bg-orange-50/60',
  },
  {
    value: 'CRITICAL',
    label: 'Critical',
    level: 4,
    pips: [true, true, true, true],
    desc: 'Life-threatening trauma, unconscious, active severe bleeding',
    colorText: 'text-rose-950',
    colorBorder: 'border-rose-400',
    colorBg: 'bg-rose-50/60',
  },
];

const COMMON_SPECIES = ['Dog', 'Cat', 'Cattle / Cow', 'Bird', 'Monkey', 'Other'];

const CreateReport = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    species: 'Dog',
    custom_species: '',
    breed: '',
    color: '',
    description: '',
    urgency: 'MEDIUM',
    address: '',
    latitude: '',
    longitude: '',
  });

  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [geoSuccess, setGeoSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError('');
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError('');
    setGeoSuccess(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setGeoLoading(false);
        setGeoSuccess(true);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setGeoError('Could not acquire automatic GPS fix. Please input coordinates or nearby address manually.');
        setGeoLoading(false);
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const validFiles = [];
    let errorMessage = '';

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        errorMessage = `File "${file.name}" exceeds the 5MB size limit.`;
      } else if (!file.type.startsWith('image/')) {
        errorMessage = `File "${file.name}" is not a recognized image format.`;
      } else {
        validFiles.push(file);
      }
    });

    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    const updatedFiles = [...selectedImages, ...validFiles].slice(0, 5);
    setSelectedImages(updatedFiles);

    const previews = updatedFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index) => {
    const updatedFiles = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(updatedFiles);

    const updatedPreviews = updatedFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(updatedPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be a valid number between -90 and 90 degrees.');
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be a valid number between -180 and 180 degrees.');
      return;
    }

    const speciesValue = formData.species === 'Other' ? formData.custom_species : formData.species;
    if (!speciesValue.trim()) {
      setError('Please specify the animal species.');
      return;
    }

    setSubmitting(true);

    try {
      const dataPayload = new FormData();
      dataPayload.append('species', speciesValue.trim());
      dataPayload.append('breed', formData.breed.trim());
      dataPayload.append('color', formData.color.trim());
      dataPayload.append('description', formData.description.trim());
      dataPayload.append('urgency', formData.urgency);
      dataPayload.append('address', formData.address.trim());
      dataPayload.append('latitude', lat);
      dataPayload.append('longitude', lng);

      selectedImages.forEach((file) => {
        dataPayload.append('images', file);
      });

      const result = await createReportApi(dataPayload);
      navigate(`/citizen/reports/${result.id}`);
    } catch (err) {
      console.error('Report submission error:', err);
      const resData = err.response?.data;
      if (resData) {
        if (typeof resData === 'object') {
          const firstKey = Object.keys(resData)[0];
          const msg = Array.isArray(resData[firstKey]) ? resData[firstKey][0] : resData[firstKey];
          setError(`${firstKey}: ${msg}`);
        } else {
          setError(String(resData));
        }
      } else {
        setError(err.message || 'Failed to transmit rescue report. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-12">
      <FieldHeader
        badge="INCIDENT DISPATCH INGEST"
        title="Report an Animal in Distress"
        subtitle="Submit precise location coordinates, condition descriptions, and photographic records to dispatch verified rescue units."
        backTo="/citizen/dashboard"
        backLabel="Back to Dashboard"
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-mono flex items-center gap-2.5">
          <span className="text-base">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Urgency Signal Assessment */}
        <div className="bg-white border border-[#E5E2D6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EFECE3] pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                STAGE 01 // TRIAGE RATING
              </span>
              <h2 className="font-serif text-lg font-bold text-[#143627]">
                Urgency Assessment Level
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">SELECT 1 OF 4</span>
          </div>

          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Choose the urgency signal level to ensure sanctuaries and responders prioritize life-threatening incidents appropriately.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {URGENCY_CHOICES.map((choice) => {
              const isSelected = formData.urgency === choice.value;

              return (
                <label
                  key={choice.value}
                  className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? `${choice.colorBg} ${choice.colorBorder} ring-2 ring-emerald-900/10 shadow-2xs`
                      : 'bg-[#FAF9F5] border-[#E5E2D6] hover:bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="urgency"
                    value={choice.value}
                    checked={isSelected}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex gap-1" aria-hidden="true">
                        {choice.pips.map((active, i) => (
                          <span
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              active
                                ? isSelected
                                  ? 'bg-[#143627]'
                                  : 'bg-slate-700'
                                : 'bg-slate-300'
                            }`}
                          />
                        ))}
                      </span>
                      <span className="font-serif font-bold text-sm text-[#143627]">
                        {choice.label} Urgency
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-xs font-mono font-bold text-[#143627]">
                        ✓ SELECTED
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-600 font-sans leading-relaxed">
                    {choice.desc}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Step 2: Animal Identification */}
        <div className="bg-white border border-[#E5E2D6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="border-b border-[#EFECE3] pb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
              STAGE 02 // SPECIMEN DATA
            </span>
            <h2 className="font-serif text-lg font-bold text-[#143627]">
              Animal Characteristics
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Species *
              </label>
              <select
                name="species"
                value={formData.species}
                onChange={handleChange}
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#143627] font-sans"
              >
                {COMMON_SPECIES.map((s) => (
                  <option key={s} value={s === 'Cattle / Cow' ? 'Cattle' : s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {formData.species === 'Other' && (
              <div>
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Specify Species *
                </label>
                <input
                  type="text"
                  name="custom_species"
                  required
                  value={formData.custom_species}
                  onChange={handleChange}
                  placeholder="e.g. Deer, Squirrel, Bat"
                  className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#143627] font-sans"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Breed / Type (Optional)
              </label>
              <input
                type="text"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
                placeholder="e.g. Indie, Retriever, Unknown"
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#143627] font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Color / Markings
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="e.g. Brown with white chest"
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#143627] font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Incident & Condition Description *
            </label>
            <textarea
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the animal's physical state, observable injuries, behavior, danger factors, or specific location hints (e.g. hiding under a parked truck near tea stall)..."
              className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none focus:border-[#143627] font-sans leading-relaxed"
            />
          </div>
        </div>

        {/* Step 3: Location Coordinates */}
        <div className="bg-white border border-[#E5E2D6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFECE3] pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                STAGE 03 // GEOSPATIAL RADAR
              </span>
              <h2 className="font-serif text-lg font-bold text-[#143627]">
                Field Location & Coordinates
              </h2>
            </div>

            <button
              type="button"
              onClick={handleGeolocation}
              disabled={geoLoading}
              className="px-3.5 py-2 rounded-xl bg-[#143627] hover:bg-[#1B4532] text-white text-xs font-mono uppercase tracking-wider font-semibold transition-colors flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              <span>{geoLoading ? 'Acquiring GPS Signal...' : 'Capture My GPS Location'}</span>
            </button>
          </div>

          {geoSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-mono flex items-center gap-2">
              <span>✓</span>
              <span>GPS coordinates calibrated successfully from client device.</span>
            </div>
          )}

          {geoError && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs font-mono flex items-center gap-2">
              <span>⚠️</span>
              <span>{geoError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Latitude Coordinates * (-90° to 90°)
              </label>
              <input
                type="number"
                step="any"
                name="latitude"
                required
                value={formData.latitude}
                onChange={handleChange}
                placeholder="12.971600"
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:border-[#143627]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Longitude Coordinates * (-180° to 180°)
              </label>
              <input
                type="number"
                step="any"
                name="longitude"
                required
                value={formData.longitude}
                onChange={handleChange}
                placeholder="77.594600"
                className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:border-[#143627]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Street Address / Landmark Details (Optional)
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. Opposite Trinity Metro Station, Pillar #142, MG Road, Bengaluru"
              className="w-full bg-[#FAF9F5] border border-[#D5D1C3] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#143627] font-sans"
            />
          </div>
        </div>

        {/* Step 4: Photographic Evidence */}
        <div className="bg-white border border-[#E5E2D6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="border-b border-[#EFECE3] pb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
              STAGE 04 // FIELD DOCUMENTATION
            </span>
            <h2 className="font-serif text-lg font-bold text-[#143627]">
              Attach Incident Photos (Up to 5 images)
            </h2>
          </div>

          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Clear photographs allow responders to identify injuries, estimate animal size, and equip their vehicle with appropriate crates and medical kits before departing.
          </p>

          <label className="border-2 border-dashed border-[#D5D1C3] hover:border-[#143627] bg-[#FAF9F5] hover:bg-[#F6F4EE] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors block">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
            />
            <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E2D6] flex items-center justify-center text-2xl text-[#143627] mb-2 shadow-2xs">
              📷
            </div>
            <span className="text-sm font-semibold text-[#143627] font-sans">
              Click to select incident photos
            </span>
            <span className="text-xs text-slate-500 mt-1 font-mono">
              JPEG, PNG, WEBP (Max 5MB each)
            </span>
          </label>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {imagePreviews.map((previewUrl, idx) => (
                <div key={idx} className="relative rounded-xl border border-[#E5E2D6] overflow-hidden aspect-square bg-[#F6F4EE] group">
                  <img src={previewUrl} alt="Incident preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xs shadow-md transition-colors"
                    title="Remove this photo"
                  >
                    ✕
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 bg-[#143627]/90 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                      PRIMARY
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Link
            to="/citizen/dashboard"
            className="text-xs font-mono uppercase tracking-wider text-slate-600 hover:text-slate-900 px-4 py-2"
          >
            ← Cancel and Return
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#D9480F] hover:bg-[#C23E0A] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Transmitting Dispatch...</span>
              </>
            ) : (
              <span>Transmit Rescue Dispatch →</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateReport;
