import { useMemo, useState } from 'react';
import type { ChangeRequest, Trip } from '../../types';
import { formatDateTimeRangeTR, formatDurationHuman, formatTimeTR } from '../../lib/dateFormat';
import {
  buildTripSchedule,
  formatEntryDuration,
  getScheduleKindMeta,
  getStopsForRecommendations,
} from '../../lib/schedule';
import TripDateBanner from './TripDateBanner';
import StopRecommendationForm, { type RecommendationFormData } from './StopRecommendationForm';
import { useTripStore } from '../../store/tripStore';
import { useAuthStore } from '../../store/authStore';

interface EditingRec {
  id: string;
  title: string;
  durationMinutes: number;
  type: 'mola' | 'konaklama';
  description?: string;
}

interface EditingRoutePoint {
  id: string;
  name: string;
  isLast: boolean;
}

interface TripScheduleProps {
  trip: Trip;
  onAddRecommendation?: (data: RecommendationFormData) => void;
}

export default function TripSchedule({ trip, onAddRecommendation }: TripScheduleProps) {
  const {
    updateStopRecommendation,
    deleteStopRecommendation,
    updateRoutePoint,
    deleteRoutePoint,
    createChangeRequest,
    approveChangeRequest,
    rejectChangeRequest,
  } = useTripStore();
  const { user } = useAuthStore();
  const isOrganizer = Boolean(user?.id === trip.organizerId);
  const schedule = useMemo(() => buildTripSchedule(trip), [trip]);
  const recommendationStops = getStopsForRecommendations(trip.route);
  const [editingRec, setEditingRec] = useState<EditingRec | null>(null);
  const [editingRoutePoint, setEditingRoutePoint] = useState<EditingRoutePoint | null>(null);
  const pendingChangeRequests = (trip.changeRequests ?? []).filter((cr) => cr.status === 'pending');

  if (!trip.route.length) {
    return <div className="text-gray-500 text-sm">Henüz rota belirlenmedi.</div>;
  }

  const handleDelete = async (recId: string) => {
    if (isOrganizer) {
      if (window.confirm('Bu mola/konaklama kaydını silmek istediğinizden emin misiniz?')) {
        await deleteStopRecommendation(trip.id, recId);
      }
    } else {
      await createChangeRequest(trip.id, {
        targetType: 'stop_recommendation',
        targetId: recId,
        action: 'delete',
        payload: {},
      });
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRec) return;
    if (isOrganizer) {
      await updateStopRecommendation(trip.id, editingRec.id, {
        title: editingRec.title,
        type: editingRec.type,
        durationMinutes: Number(editingRec.durationMinutes),
        description: editingRec.description,
      });
    } else {
      await createChangeRequest(trip.id, {
        targetType: 'stop_recommendation',
        targetId: editingRec.id,
        action: 'edit',
        payload: {
          title: editingRec.title,
          type: editingRec.type,
          durationMinutes: Number(editingRec.durationMinutes),
          description: editingRec.description,
        },
      });
    }
    setEditingRec(null);
  };

  const handleDeleteRoutePoint = async (pointId: string, pointName: string) => {
    if (isOrganizer) {
      if (window.confirm(`"${pointName}" durağını rotadan silmek istediğinizden emin misiniz?`)) {
        await deleteRoutePoint(trip.id, pointId);
      }
    } else {
      await createChangeRequest(trip.id, {
        targetType: 'route_point',
        targetId: pointId,
        action: 'delete',
        payload: {},
      });
    }
  };

  const handleSaveRoutePointEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoutePoint) return;
    if (isOrganizer) {
      await updateRoutePoint(trip.id, editingRoutePoint.id, {
        name: editingRoutePoint.name,
      });
    } else {
      await createChangeRequest(trip.id, {
        targetType: 'route_point',
        targetId: editingRoutePoint.id,
        action: 'edit',
        payload: { name: editingRoutePoint.name },
      });
    }
    setEditingRoutePoint(null);
  };

  const handleApprove = async (crId: string) => {
    await approveChangeRequest(trip.id, crId);
  };

  const handleReject = async (crId: string) => {
    await rejectChangeRequest(trip.id, crId);
  };

  return (
    <div className="space-y-6">
      <TripDateBanner
        startDate={trip.startDate}
        startTime={trip.startTime}
        endDate={trip.endDate}
        estimatedArrivalAt={schedule.estimatedArrivalAt}
      />

      <div className="flex flex-wrap gap-2">
        {(trip.totalDistanceKm ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">
            📍 {trip.totalDistanceKm} km
          </span>
        )}
        {schedule.totalTravelMinutes > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full">
            🚗 Yol {formatDurationHuman(schedule.totalTravelMinutes)}
          </span>
        )}
        {schedule.totalBreakMinutes > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-800 px-3 py-1.5 rounded-full">
            ☕ Mola {formatDurationHuman(schedule.totalBreakMinutes)}
          </span>
        )}
        {schedule.totalStayMinutes > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-50 text-indigo-800 px-3 py-1.5 rounded-full">
            🏨 Konaklama {formatDurationHuman(schedule.totalStayMinutes)}
          </span>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-slate-50 text-left">
              <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider w-[130px]">Saat</th>
              <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider w-[110px]">Tür</th>
              <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Etkinlik</th>
              <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider w-[100px]">Süre</th>
              <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider w-[180px]">Öneren & İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {schedule.entries.map((entry) => {
              const meta = getScheduleKindMeta(entry.kind);
              const isRecEditable = Boolean(entry.recId);
              const isRoutePoint = entry.kind === 'departure' || entry.kind === 'stop' || entry.kind === 'arrival';
              const routePoint = isRoutePoint ? trip.route.find((p) => p.order === entry.stopOrder) : null;
              const isRouteEditable = Boolean(routePoint) && trip.route.length > 2;
              return (
                <tr key={entry.id} className={`border-l-4 ${meta.rowClass} hover:bg-black/[0.02] transition`}>
                  <td className="px-4 py-4 align-top">
                    <p className="font-bold text-gray-900 tabular-nums">{formatTimeTR(entry.startAt)}</p>
                    {entry.endAt && (
                      <p className="text-xs text-gray-500 tabular-nums mt-0.5">
                        {formatDateTimeRangeTR(entry.startAt, entry.endAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${meta.badgeClass}`}>
                      <span>{meta.icon}</span> {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="font-semibold text-gray-900">{entry.title}</p>
                    {entry.subtitle && <p className="text-xs text-gray-500 mt-0.5">{entry.subtitle}</p>}
                    {entry.description && (
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{entry.description}</p>
                    )}
                    {entry.distanceKm != null && (
                      <p className="text-xs text-slate-500 mt-1">{entry.distanceKm} km</p>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top font-medium text-gray-700 tabular-nums">
                    {formatEntryDuration(entry)}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center justify-between gap-2">
                      {entry.suggestedBy ? (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={entry.suggestedBy.avatar}
                            alt={entry.suggestedBy.name}
                            className="w-6 h-6 rounded-full border border-white shadow-sm"
                          />
                          <span className="text-xs font-medium text-gray-700 truncate max-w-[80px]">{entry.suggestedBy.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}

                      {(isRecEditable && entry.recId) || (isRouteEditable && routePoint) ? (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isRecEditable && entry.recId && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingRec({
                                    id: entry.recId!,
                                    title: entry.title,
                                    durationMinutes: entry.durationMinutes ?? 15,
                                    type: entry.kind === 'konaklama' ? 'konaklama' : 'mola',
                                    description: entry.description,
                                  })
                                }
                                title="Düzenle"
                                className="p-1 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(entry.recId!)}
                                title="Sil"
                                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                          {isRouteEditable && routePoint && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingRoutePoint({
                                    id: routePoint.id,
                                    name: routePoint.name,
                                    isLast: entry.kind === 'arrival',
                                  })
                                }
                                title="Durak Adını Düzenle"
                                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteRoutePoint(routePoint.id, routePoint.name)}
                                title="Durak Sil"
                                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {schedule.entries.map((entry) => {
          const meta = getScheduleKindMeta(entry.kind);
          const isRecEditable = Boolean(entry.recId);
          const isRoutePoint = entry.kind === 'departure' || entry.kind === 'stop' || entry.kind === 'arrival';
          const routePoint = isRoutePoint ? trip.route.find((p) => p.order === entry.stopOrder) : null;
          const isRouteEditable = Boolean(routePoint) && trip.route.length > 2;
          return (
            <div
              key={entry.id}
              className={`rounded-xl border border-gray-100 border-l-4 ${meta.rowClass} p-4 shadow-sm`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${meta.badgeClass}`}>
                  {meta.icon} {meta.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{formatTimeTR(entry.startAt)}</span>
                  {isRecEditable && entry.recId && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingRec({
                            id: entry.recId!,
                            title: entry.title,
                            durationMinutes: entry.durationMinutes ?? 15,
                            type: entry.kind === 'konaklama' ? 'konaklama' : 'mola',
                            description: entry.description,
                          })
                        }
                        className="p-1 text-xs hover:bg-gray-100 rounded"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(entry.recId!)}
                        className="p-1 text-xs hover:bg-red-50 text-red-600 rounded"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                  {isRouteEditable && routePoint && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingRoutePoint({
                            id: routePoint.id,
                            name: routePoint.name,
                            isLast: entry.kind === 'arrival',
                          })
                        }
                        className="p-1 text-xs hover:bg-blue-50 text-blue-600 rounded"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteRoutePoint(routePoint.id, routePoint.name)}
                        className="p-1 text-xs hover:bg-red-50 text-red-600 rounded"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="font-semibold text-gray-900">{entry.title}</p>
              {entry.subtitle && <p className="text-xs text-gray-500 mt-0.5">{entry.subtitle}</p>}
              {entry.description && <p className="text-xs text-gray-600 mt-1">{entry.description}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100/80">
                <span className="text-xs font-medium text-gray-600">Süre: {formatEntryDuration(entry)}</span>
                {entry.suggestedBy && (
                  <div className="flex items-center gap-1.5">
                    <img src={entry.suggestedBy.avatar} alt="" className="w-5 h-5 rounded-full" />
                    <span className="text-xs text-gray-600">{entry.suggestedBy.name}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {recommendationStops.length > 0 && onAddRecommendation && (
        <div className="border-t border-gray-200/80 pt-6">
          <StopRecommendationForm stops={recommendationStops} onSubmit={onAddRecommendation} />
        </div>
      )}

      {/* Pending Change Requests Panel (organizer only) */}
      {isOrganizer && pendingChangeRequests.length > 0 && (
        <div className="border-t border-gray-200/80 pt-6">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>🔔</span> Onay Bekleyen Değişiklik Talepleri ({pendingChangeRequests.length})
          </h4>
          <div className="space-y-2">
            {pendingChangeRequests.map((cr) => (
              <ChangeRequestCard
                key={cr.id}
                cr={cr}
                trip={trip}
                onApprove={() => void handleApprove(cr.id)}
                onReject={() => void handleReject(cr.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Non-organizer info banner */}
      {!isOrganizer && (
        <div className="border-t border-gray-200/80 pt-4">
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
            💡 Düzenleme ve silme talepleriniz organizatör onayından sonra geçerli olacaktır.
          </p>
        </div>
      )}

      {/* Edit Modal — Stop Recommendation */}
      {editingRec && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in-scale">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold font-[Outfit] text-gray-900 mb-4 flex items-center gap-2">
              <span>✏️</span> {isOrganizer ? 'Durak / Mola Düzenle' : 'Değişiklik Talebi Oluştur'}
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Başlık / Mekan Adı</label>
                <input
                  type="text"
                  required
                  value={editingRec.title}
                  onChange={(e) => setEditingRec({ ...editingRec, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tür</label>
                  <select
                    value={editingRec.type}
                    onChange={(e) => setEditingRec({ ...editingRec, type: e.target.value as 'mola' | 'konaklama' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="mola">☕ Mola / Yemek</option>
                    <option value="konaklama">🏨 Konaklama / Otel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Süre (Dakika)</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    required
                    value={editingRec.durationMinutes}
                    onChange={(e) => setEditingRec({ ...editingRec, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Açıklama / Not</label>
                <textarea
                  rows={2}
                  value={editingRec.description ?? ''}
                  onChange={(e) => setEditingRec({ ...editingRec, description: e.target.value })}
                  placeholder="İsteğe bağlı not..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRec(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-md shadow-emerald-600/20"
                >
                  {isOrganizer ? 'Kaydet' : 'Talep Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal — Route Point */}
      {editingRoutePoint && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in-scale">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold font-[Outfit] text-gray-900 mb-4 flex items-center gap-2">
              <span>✏️</span> {isOrganizer ? 'Durak Adını Düzenle' : 'Durak Değişiklik Talebi'}
            </h3>
            <form onSubmit={handleSaveRoutePointEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Durak Adı</label>
                <input
                  type="text"
                  required
                  value={editingRoutePoint.name}
                  onChange={(e) => setEditingRoutePoint({ ...editingRoutePoint, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoutePoint(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-md shadow-blue-600/20"
                >
                  {isOrganizer ? 'Kaydet' : 'Talep Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangeRequestCard({
  cr,
  trip,
  onApprove,
  onReject,
}: {
  cr: ChangeRequest;
  trip: Trip;
  onApprove: () => void;
  onReject: () => void;
}) {
  const targetLabel = (() => {
    if (cr.targetType === 'route_point') {
      const point = trip.route.find((p) => p.id === cr.targetId);
      return point?.name ?? 'Durak';
    }
    const rec = trip.stopRecommendations?.find((r) => r.id === cr.targetId);
    return rec?.title ?? 'Mola/Konaklama';
  })();

  const actionLabel = cr.action === 'delete' ? 'Silme' : 'Düzenleme';
  const payloadSummary = (() => {
    if (cr.action === 'delete') return '';
    const p = cr.payload;
    const parts: string[] = [];
    if (p.name) parts.push(`Ad: ${p.name}`);
    if (p.title) parts.push(`Başlık: ${p.title}`);
    if (p.durationMinutes) parts.push(`Süre: ${p.durationMinutes} dk`);
    if (p.type) parts.push(`Tür: ${p.type}`);
    return parts.join(' • ');
  })();

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
      <img
        src={cr.requestedByAvatar}
        alt={cr.requestedByName}
        className="w-8 h-8 rounded-full flex-shrink-0 border border-white shadow-sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-900">{cr.requestedByName}</span>
          {cr.isAiRequest && (
            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">AI</span>
          )}
          <span className="text-xs text-gray-600">
            {actionLabel} talebi: <strong>{targetLabel}</strong>
          </span>
        </div>
        {payloadSummary && (
          <p className="text-xs text-gray-600 mt-1">{payloadSummary}</p>
        )}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onApprove}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition"
          >
            ✓ Onayla
          </button>
          <button
            type="button"
            onClick={onReject}
            className="text-xs font-bold bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg transition"
          >
            ✕ Reddet
          </button>
        </div>
      </div>
    </div>
  );
}
