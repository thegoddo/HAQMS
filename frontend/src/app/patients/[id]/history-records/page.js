"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/common/Navbar";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  ShieldAlert,
  Clock,
} from "lucide-react";

export default function PatientHistoryRecordsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, token, API_BASE_URL } = useAuth();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Wait until auth initialization completes.
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);
  useEffect(() => {
    if (!id || !token) return;

    const controller = new AbortController();

    const loadPatient = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load patient history");
        }

        setPatient(data);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "Failed to load patient history");
      } finally {
        setLoading(false);
      }
    };

    loadPatient();

    return () => controller.abort();
  }, [API_BASE_URL, id, token]);

  const appointments = patient?.appointments || [];

  const formatDateTime = (value) => {
    if (!value) return "Unknown";
    return new Date(value).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-teal-600 dark:text-teal-400 font-bold">
              Legacy Medical Records
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">
              Patient History Records
            </h1>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-500/5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="glass p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col items-center justify-center py-16">
            <div className="pulse-loader">
              <div></div>
              <div></div>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-400">
              Loading legacy patient records...
            </p>
          </div>
        ) : error ? (
          <div className="glass p-6 rounded-2xl border border-rose-500/20 shadow-md bg-rose-500/5 text-rose-500">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold">Unable to load records</h2>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : patient ? (
          <div className="space-y-6">
            <section className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider mb-4">
                    <Activity className="h-4 w-4" />
                    Patient Summary
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                    {patient.name}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {patient.gender} • {patient.age} years old
                    {patient.phoneNumber ? ` • ${patient.phoneNumber}` : ""}
                    {patient.email ? ` • ${patient.email}` : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 min-w-[260px]">
                  <div className="p-4 rounded-xl bg-slate-500/5 border border-slate-200 dark:border-slate-800">
                    <span className="block text-xxs uppercase tracking-wider text-slate-400 font-bold">
                      Appointments
                    </span>
                    <strong className="block mt-1 text-2xl font-black text-slate-800 dark:text-slate-100">
                      {appointments.length}
                    </strong>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-500/5 border border-slate-200 dark:border-slate-800">
                    <span className="block text-xxs uppercase tracking-wider text-slate-400 font-bold">
                      Record ID
                    </span>
                    <strong className="block mt-1 text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                      {patient.id}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md lg:col-span-1">
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <ClipboardList className="h-5 w-5 text-teal-600" />
                  Clinical Background
                </h3>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-6 font-medium">
                  {patient.medicalHistory?.toUpperCase() ??
                    "No medical history recorded."}
                </div>
              </div>

              <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md lg:col-span-2">
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <CalendarDays className="h-5 w-5 text-teal-600" />
                  Appointment History
                </h3>

                {appointments.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    This patient has no appointments on record yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold border-b border-slate-200 dark:border-slate-800">
                          <th className="pb-3">Date / Time</th>
                          <th className="pb-3">Doctor</th>
                          <th className="pb-3">Reason</th>
                          <th className="pb-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {appointments
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(b.appointmentDate) -
                              new Date(a.appointmentDate),
                          )
                          .map((appointment) => (
                            <tr
                              key={appointment.id}
                              className="hover:bg-slate-500/5 transition-colors"
                            >
                              <td className="py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-slate-400" />
                                  {formatDateTime(appointment.appointmentDate)}
                                </div>
                              </td>
                              <td className="py-3.5 text-slate-700 dark:text-slate-300">
                                <div className="font-bold">
                                  {appointment.doctor?.name || "Unknown Doctor"}
                                </div>
                                <div className="text-xxs text-slate-400 uppercase tracking-wider mt-0.5">
                                  {appointment.doctor?.specialization ||
                                    "Unspecified specialty"}
                                </div>
                              </td>
                              <td className="py-3.5 text-slate-500 dark:text-slate-400">
                                {appointment.reason || "None provided"}
                              </td>
                              <td className="py-3.5 text-right">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase ${
                                    appointment.status === "COMPLETED"
                                      ? "bg-teal-500/10 text-teal-600"
                                      : appointment.status === "CANCELLED"
                                        ? "bg-rose-500/10 text-rose-500"
                                        : "bg-amber-500/10 text-amber-500"
                                  }`}
                                >
                                  {appointment.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No patient record was found.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
