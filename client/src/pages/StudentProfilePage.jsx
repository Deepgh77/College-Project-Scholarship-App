import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  User,
  MapPin,
  GraduationCap,
  Users,
  CreditCard,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  HelpCircle,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export function StudentProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [completion, setCompletion] = useState({ total: 0, sections: {} });

  // Form State initialized to empty strings without synthetic defaults
  const [formData, setFormData] = useState({
    // Personal Details
    fullName: '',
    dob: '',
    gender: '',
    category: '',
    religion: '',
    isHandicapped: false,
    disabilityPercentage: '',

    // Contact & Address
    mobile: '',
    address: '',
    state: '',
    district: '',
    taluka: '',
    cityVillage: '',
    pincode: '',

    // Academic Details
    collegeId: '',
    courseName: '',
    courseYear: '',
    admissionYear: '',
    previousQualification: '',
    previousPercentage: '',

    // Family / Income Details
    guardianName: '',
    annualFamilyIncome: '',

    // Bank Details
    bankAccountNo: '',
    bankIfsc: '',
    bankName: '',
  });

  // Load profile and college directory on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const [profileRes, collegeRes] = await Promise.all([
          api.getStudentProfile(),
          api.getColleges(),
        ]);

        if (collegeRes.success) {
          setColleges(collegeRes.colleges || []);
        }

        if (profileRes.success && profileRes.profile) {
          const p = profileRes.profile;
          setFormData({
            fullName: p.fullName || '',
            dob: p.dob ? p.dob.substring(0, 10) : '',
            gender: p.gender || '',
            category: p.category || '',
            religion: p.religion || '',
            isHandicapped: !!p.isHandicapped,
            disabilityPercentage: p.disabilityPercentage ? p.disabilityPercentage.toString() : '',

            mobile: p.mobile || '',
            address: p.address || '',
            state: p.state || '',
            district: p.district || '',
            taluka: p.taluka || '',
            cityVillage: p.cityVillage || '',
            pincode: p.pincode || '',

            collegeId: p.collegeId || '',
            courseName: p.courseName || '',
            courseYear: p.courseYear ? p.courseYear.toString() : '',
            admissionYear: p.admissionYear ? p.admissionYear.toString() : '',
            previousQualification: p.previousQualification || '',
            previousPercentage: p.previousPercentage !== null && p.previousPercentage !== undefined ? Number(p.previousPercentage).toString() : '',

            guardianName: p.guardianName || '',
            annualFamilyIncome: p.annualFamilyIncome !== null && p.annualFamilyIncome !== undefined ? Number(p.annualFamilyIncome).toString() : '',

            bankAccountNo: p.bankAccountNo || '',
            bankIfsc: p.bankIfsc || '',
            bankName: p.bankName || '',
          });
        }

        if (profileRes.completion) {
          setCompletion(profileRes.completion);
        }
      } catch (err) {
        setError(err.message || 'Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      // Build payload: missing/empty fields explicitly map to null (no synthetic defaults)
      const payload = {
        fullName: formData.fullName?.trim() || null,
        dob: formData.dob || null,
        gender: formData.gender || null,
        category: formData.category || null,
        religion: formData.religion?.trim() || null,
        isHandicapped: Boolean(formData.isHandicapped),
        disabilityPercentage: formData.isHandicapped && formData.disabilityPercentage ? Number(formData.disabilityPercentage) : null,

        mobile: formData.mobile?.trim() || null,
        address: formData.address?.trim() || null,
        state: formData.state?.trim() || null,
        district: formData.district?.trim() || null,
        taluka: formData.taluka?.trim() || null,
        cityVillage: formData.cityVillage?.trim() || null,
        pincode: formData.pincode?.trim() || null,

        collegeId: formData.collegeId || null,
        courseName: formData.courseName?.trim() || null,
        courseYear: formData.courseYear ? Number(formData.courseYear) : null,
        admissionYear: formData.admissionYear ? Number(formData.admissionYear) : null,
        previousQualification: formData.previousQualification?.trim() || null,
        previousPercentage: formData.previousPercentage !== '' ? Number(formData.previousPercentage) : null,

        guardianName: formData.guardianName?.trim() || null,
        annualFamilyIncome: formData.annualFamilyIncome !== '' ? Number(formData.annualFamilyIncome) : null,

        bankAccountNo: formData.bankAccountNo?.trim() || null,
        bankIfsc: formData.bankIfsc?.trim() ? formData.bankIfsc.trim().toUpperCase() : null,
        bankName: formData.bankName?.trim() || null,
      };

      const res = await api.saveStudentProfile(payload);
      if (res.success) {
        setSuccessMsg('Profile updated successfully! Progress saved.');
        if (res.completion) {
          setCompletion(res.completion);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError(err.message || 'Failed to save profile. Please review the highlighted fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading student profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">{user?.email}</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Title & Introduction */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Student Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete your profile details once. This information will be automatically reused across all scholarship applications.
          </p>
        </div>

        {/* Completion Progress Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Profile Completion
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  completion.total >= 80
                    ? 'bg-emerald-100 text-emerald-800'
                    : completion.total >= 50
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {completion.total}%
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {completion.total === 100 ? 'Fully completed' : 'Partial progress saved'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                completion.total >= 80
                  ? 'bg-emerald-500'
                  : completion.total >= 50
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${completion.total}%` }}
            />
          </div>

          {/* Breakdown Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px] text-center">
            <div className="p-1.5 rounded bg-slate-50">
              <div className="text-slate-400">Personal</div>
              <div className="font-semibold text-slate-700">{completion.sections?.personal || 0}/20%</div>
            </div>
            <div className="p-1.5 rounded bg-slate-50">
              <div className="text-slate-400">Address</div>
              <div className="font-semibold text-slate-700">{completion.sections?.address || 0}/20%</div>
            </div>
            <div className="p-1.5 rounded bg-slate-50">
              <div className="text-slate-400">Academic</div>
              <div className="font-semibold text-slate-700">{completion.sections?.academic || 0}/20%</div>
            </div>
            <div className="p-1.5 rounded bg-slate-50">
              <div className="text-slate-400">Income</div>
              <div className="font-semibold text-slate-700">{completion.sections?.income || 0}/20%</div>
            </div>
            <div className="p-1.5 rounded bg-slate-50 col-span-2 sm:col-span-1">
              <div className="text-slate-400">Bank</div>
              <div className="font-semibold text-slate-700">{completion.sections?.bank || 0}/20%</div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start space-x-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-start space-x-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* SECTION 1: Personal Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">1. Personal Information</h2>
                <p className="text-xs text-slate-500">Applicant identity and demographic information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="fullName">
                  Full Name (as per marksheet) *
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Suresh Patil"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="dob">
                  Date of Birth *
                </label>
                <input
                  id="dob"
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="gender">
                  Gender *
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="">-- Select Gender --</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="category">
                    Caste Category *
                  </label>
                  <span className="text-[11px] text-indigo-600 flex items-center space-x-0.5" title="Category used for scholarship eligibility criteria">
                    <HelpCircle className="w-3 h-3" />
                    <span>Eligible schemes depend on category</span>
                  </span>
                </div>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                >
                  <option value="">-- Select Caste Category --</option>
                  <option value="OPEN">OPEN / General</option>
                  <option value="OBC">OBC (Other Backward Class)</option>
                  <option value="SC">SC (Scheduled Caste)</option>
                  <option value="ST">ST (Scheduled Tribe)</option>
                  <option value="VJNT">VJNT (Vimukta Jati / Nomadic Tribes)</option>
                  <option value="SBC">SBC (Special Backward Class)</option>
                  <option value="EWS">EWS (Economically Weaker Section)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="religion">
                  Religion
                </label>
                <input
                  id="religion"
                  name="religion"
                  type="text"
                  value={formData.religion}
                  onChange={handleChange}
                  placeholder="e.g. Hindu, Muslim, Buddhist, Christian"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isHandicapped"
                    checked={formData.isHandicapped}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>Person with Disability (Divyang / Handicapped)</span>
                </label>

                {formData.isHandicapped && (
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-slate-600 whitespace-nowrap" htmlFor="disabilityPercentage">
                      Disability Percentage (%):
                    </label>
                    <input
                      id="disabilityPercentage"
                      name="disabilityPercentage"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.disabilityPercentage}
                      onChange={handleChange}
                      placeholder="e.g. 40"
                      className="w-20 px-2 py-1 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Contact & Address */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">2. Contact & Address Details</h2>
                <p className="text-xs text-slate-500">Permanent communication and residential address</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="mobile">
                  Mobile Number (10 digits) *
                </label>
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  maxLength="10"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="state">
                  State of Residence *
                </label>
                <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="">-- Select State of Residence --</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Goa">Goa</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Other">Other State / UT</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="address">
                  Full Permanent Address *
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows="2"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="House/Plot number, street, landmark..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="district">
                  District *
                </label>
                <input
                  id="district"
                  name="district"
                  type="text"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="e.g. Pune, Mumbai Suburban, Thane"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="taluka">
                  Taluka / Tehsil *
                </label>
                <input
                  id="taluka"
                  name="taluka"
                  type="text"
                  value={formData.taluka}
                  onChange={handleChange}
                  placeholder="e.g. Haveli, Kalyan, Ambegaon"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="cityVillage">
                  City / Village *
                </label>
                <input
                  id="cityVillage"
                  name="cityVillage"
                  type="text"
                  value={formData.cityVillage}
                  onChange={handleChange}
                  placeholder="e.g. Pune"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="pincode">
                  Pincode (6 digits) *
                </label>
                <input
                  id="pincode"
                  name="pincode"
                  type="text"
                  maxLength="6"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="e.g. 411004"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Academic Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">3. Academic Information</h2>
                <p className="text-xs text-slate-500">Current enrollment and previous examination qualification</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="collegeId">
                  College / Institute *
                </label>
                <select
                  id="collegeId"
                  name="collegeId"
                  value={formData.collegeId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                >
                  <option value="">-- Select Registered Institute --</option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.district})
                    </option>
                  ))}
                </select>
                {colleges.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No colleges are currently available.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="courseName">
                  Course / Program Name *
                </label>
                <input
                  id="courseName"
                  name="courseName"
                  type="text"
                  value={formData.courseName}
                  onChange={handleChange}
                  placeholder="e.g. Bachelor of Computer Applications (BCA)"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="courseYear">
                  Current Course Year (1-6) *
                </label>
                <select
                  id="courseYear"
                  name="courseYear"
                  value={formData.courseYear}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="">-- Select Course Year --</option>
                  <option value="1">1st Year (First Year)</option>
                  <option value="2">2nd Year (Second Year)</option>
                  <option value="3">3rd Year (Third Year)</option>
                  <option value="4">4th Year (Fourth Year)</option>
                  <option value="5">5th Year (Fifth Year)</option>
                  <option value="6">6th Year (Sixth Year)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="admissionYear">
                  Admission Year *
                </label>
                <input
                  id="admissionYear"
                  name="admissionYear"
                  type="number"
                  min="2015"
                  max="2035"
                  value={formData.admissionYear}
                  onChange={handleChange}
                  placeholder="e.g. 2024"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="previousQualification">
                  Previous Qualification *
                </label>
                <input
                  id="previousQualification"
                  name="previousQualification"
                  type="text"
                  value={formData.previousQualification}
                  onChange={handleChange}
                  placeholder="e.g. HSC / 12th Science"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="previousPercentage">
                  Previous Exam Marks Percentage (%) *
                </label>
                <input
                  id="previousPercentage"
                  name="previousPercentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.previousPercentage}
                  onChange={handleChange}
                  placeholder="e.g. 78.50"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Family & Income Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">4. Family & Income Information</h2>
                <p className="text-xs text-slate-500">Guardian and annual household income (from income certificate)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="guardianName">
                  Guardian / Father's Name *
                </label>
                <input
                  id="guardianName"
                  name="guardianName"
                  type="text"
                  value={formData.guardianName}
                  onChange={handleChange}
                  placeholder="e.g. Suresh Patil"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="annualFamilyIncome">
                    Annual Family Income (₹) *
                  </label>
                  <span className="text-[11px] text-indigo-600 flex items-center space-x-0.5" title="As stated on competent authority Income Certificate">
                    <HelpCircle className="w-3 h-3" />
                    <span>Per Income Certificate</span>
                  </span>
                </div>
                <input
                  id="annualFamilyIncome"
                  name="annualFamilyIncome"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.annualFamilyIncome}
                  onChange={handleChange}
                  placeholder="e.g. 150000"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Bank Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">5. Bank Details (Simulation)</h2>
                <p className="text-xs text-slate-500">Student account for simulated benefit disbursement</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Academic Simulation Notice:</strong> This project simulates scholarship disbursement batches. No live banking, Aadhaar seeding, or real money transfers are performed.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="bankAccountNo">
                  Savings Bank Account Number *
                </label>
                <input
                  id="bankAccountNo"
                  name="bankAccountNo"
                  type="text"
                  value={formData.bankAccountNo}
                  onChange={handleChange}
                  placeholder="e.g. 30123456789"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="bankIfsc">
                  Bank IFSC Code (11 characters) *
                </label>
                <input
                  id="bankIfsc"
                  name="bankIfsc"
                  type="text"
                  maxLength="11"
                  value={formData.bankIfsc}
                  onChange={handleChange}
                  placeholder="e.g. SBIN0001234"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white uppercase font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="bankName">
                  Bank Name *
                </label>
                <input
                  id="bankName"
                  name="bankName"
                  type="text"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="e.g. State Bank of India"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Bottom Save Action Bar */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-200">
            <Link
              to="/dashboard"
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-60 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving Profile...' : 'Save & Update Profile'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
