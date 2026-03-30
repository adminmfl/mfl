/**
 * My League Record — 1-Page PDF
 * Matches client-provided PFL Summary Report format
 */

import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet,
    Svg,
    Path,
} from '@react-pdf/renderer';
import type { LeagueReportData } from '@/lib/services/league-report';

// ============================================================================
// Theme
// ============================================================================

const theme = {
    blueDark: '#1E3A8A',
    bluePrimary: '#2563EB',
    blueLight: '#EFF6FF',
    grayText: '#374151',
    grayLight: '#F3F4F6',
    grayBorder: '#D1D5DB',
    grayMuted: '#9CA3AF',
    white: '#FFFFFF',
    accent: '#F59E0B',
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        backgroundColor: theme.white,
        flexDirection: 'column',
    },

    // --- Header ---
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 3,
        borderBottomColor: theme.blueDark,
    },
    headerLogoBox: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    logoPlaceholder: {
        width: 55,
        height: 55,
        backgroundColor: theme.grayLight,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoPlaceholderText: {
        fontSize: 8,
        color: theme.grayText,
        fontWeight: 'bold',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    brandText: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: theme.grayMuted,
        letterSpacing: 2,
        marginBottom: 2,
    },
    reportTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.blueDark,
    },
    reportSubtitle: {
        fontSize: 10,
        color: theme.grayMuted,
        marginTop: 3,
    },

    // --- User Info Strip ---
    userStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.blueLight,
        padding: 14,
        borderRadius: 6,
        marginBottom: 16,
        borderLeftWidth: 5,
        borderLeftColor: theme.blueDark,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.blueDark,
    },
    teamLabel: {
        fontSize: 11,
        color: theme.bluePrimary,
        marginLeft: 6,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 20,
    },
    statBox: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 8,
        color: theme.grayMuted,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.blueDark,
    },

    // --- Two Column Sections ---
    columnsContainer: {
        flexDirection: 'row',
        gap: 14,
        marginBottom: 16,
    },

    // --- Section Box ---
    section: {
        flex: 1,
        borderWidth: 1,
        borderColor: theme.grayBorder,
        borderRadius: 6,
        overflow: 'hidden',
    },
    sectionHeader: {
        backgroundColor: theme.blueDark,
        paddingVertical: 7,
        paddingHorizontal: 12,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.white,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionContent: {
        padding: 10,
    },

    // --- Metric Row ---
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: theme.grayLight,
    },
    metricRowLast: {
        borderBottomWidth: 0,
    },
    metricLabel: {
        fontSize: 10,
        color: theme.grayText,
    },
    metricValue: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.blueDark,
    },

    // --- Individual Standing ---
    standingCenter: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    trophyCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    standingMainText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.blueDark,
        textAlign: 'center',
    },
    standingSubText: {
        fontSize: 9,
        color: theme.grayMuted,
        marginTop: 3,
        textAlign: 'center',
    },

    // --- Activity Table ---
    tableTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.blueDark,
        marginBottom: 8,
    },
    table: {
        width: '100%',
        borderWidth: 1,
        borderColor: theme.grayBorder,
        borderRadius: 4,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: theme.blueDark,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    tableHeaderCell: {
        color: theme.white,
        fontSize: 9,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.grayLight,
    },
    tableRowAlt: {
        backgroundColor: theme.blueLight,
    },
    tableCell: {
        fontSize: 9,
        color: theme.grayText,
    },
    tableCellBold: {
        fontSize: 9,
        fontWeight: 'bold',
        color: theme.blueDark,
    },

    // --- Footer ---
    footer: {
        textAlign: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme.grayLight,
        marginTop: 'auto',
    },
    footerText: {
        fontSize: 8,
        color: theme.grayMuted,
    },
});

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(minutes: number | null): string {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

function formatAvgPerSession(total: number | null, sessions: number): string {
    if (!total || sessions === 0) return '-';
    const avg = total / sessions;
    // If it looks like duration (minutes)
    if (avg > 1) return formatDuration(Math.round(avg));
    return avg.toFixed(1);
}

function formatNumber(n: number | null): string {
    if (!n) return '-';
    return n.toLocaleString();
}

function getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

// ============================================================================
// Components
// ============================================================================

const Logo = ({ src, placeholderText }: { src: string | null; placeholderText: string }) => (
    <View style={styles.headerLogoBox}>
        {src ? (
            <Image src={src} style={styles.logo} />
        ) : (
            <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>{placeholderText}</Text>
            </View>
        )}
    </View>
);

const MetricRow = ({ label, value, isLast = false }: { label: string; value: string | number; isLast?: boolean }) => (
    <View style={[styles.metricRow, isLast && styles.metricRowLast]}>
        <Text style={styles.metricLabel}>{label}:</Text>
        <Text style={styles.metricValue}>{String(value)}</Text>
    </View>
);

const TrophyIcon = ({ size = 24 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
            fill="#FFFFFF"
            d="M20.2 2H3.8c-1.1 0-2 .9-2 2v3.5c0 1.9 1.5 3.5 3.4 3.5h.3c1 2.3 3.3 3.9 6 3.9s5-1.6 6-3.9h.3c1.9 0 3.4-1.6 3.4-3.5V4c0-1.1-.9-2-2-2z"
        />
        <Path fill="#FFFFFF" d="M10 16h4v2h-4zM7 19h10v3H7z" />
    </Svg>
);

// ============================================================================
// Main PDF Component
// ============================================================================

interface LeagueReportPDFProps {
    data: LeagueReportData;
}

export function LeagueReportPDF({ data }: LeagueReportPDFProps) {
    const totalPoints = data.finalIndividualScore;
    const bestStreak = data.performance.bestStreak;

    // Determine standing text
    const isCompleted = data.league.endDate && new Date(data.league.endDate) < new Date();
    const standingText = isCompleted
        ? 'League Completed. Congrats!'
        : `#${data.rankings.userRankInLeague}${getOrdinal(data.rankings.userRankInLeague)} in League`;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* ===== HEADER ===== */}
                <View style={styles.headerContainer}>
                    <Logo src={data.league.logoUrl} placeholderText="MFL" />
                    <View style={styles.headerCenter}>
                        <Text style={styles.brandText}>MY FITNESS LEAGUE</Text>
                        <Text style={styles.reportTitle}>My League Record</Text>
                        <Text style={styles.reportSubtitle}>
                            {formatDate(data.league.startDate)} - {formatDate(data.league.endDate)}
                        </Text>
                    </View>
                    <Logo src={data.team?.logoUrl || null} placeholderText={data.team?.name?.substring(0, 3).toUpperCase() || 'TEAM'} />
                </View>

                {/* ===== USER INFO STRIP ===== */}
                <View style={styles.userStrip}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.userName}>{data.user.username}</Text>
                        {data.team && <Text style={styles.teamLabel}>| {data.team.name}</Text>}
                    </View>
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Total Points</Text>
                            <Text style={styles.statValue}>{totalPoints}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Avg RR</Text>
                            <Text style={styles.statValue}>{data.averageRR > 0 ? data.averageRR.toFixed(2) : '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* ===== PERFORMANCE OVERVIEW + INDIVIDUAL STANDING ===== */}
                <View style={styles.columnsContainer}>
                    {/* Left: Performance Overview */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Performance Overview</Text>
                        </View>
                        <View style={styles.sectionContent}>
                            <MetricRow label="Points earned for team" value={totalPoints} />
                            <MetricRow label="Rest Days Taken" value={data.restDays.total} />
                            <MetricRow label="Active Days" value={data.performance.totalActiveDays} />
                            <MetricRow label="Missed Days" value={data.performance.totalMissedDays} />
                            <MetricRow label="Best Streak (consecutive workout days)" value={`${bestStreak} Days`} isLast />
                        </View>
                    </View>

                    {/* Right: Individual Standing */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Individual Standing</Text>
                        </View>
                        <View style={styles.sectionContent}>
                            <View style={styles.standingCenter}>
                                <View style={styles.trophyCircle}>
                                    <TrophyIcon size={26} />
                                </View>
                                <Text style={styles.standingMainText}>{standingText}</Text>
                                <Text style={styles.standingSubText}>
                                    {totalPoints} Total Points | {data.averageRR > 0 ? data.averageRR.toFixed(2) : '-'} Avg RR
                                </Text>
                                {data.team && (
                                    <Text style={styles.standingSubText}>
                                        Team Rank: #{data.rankings.teamRankInLeague} | Your Rank in Team: #{data.rankings.userRankInTeam}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* ===== ACTIVITY DETAILS TABLE ===== */}
                <Text style={styles.tableTitle}>Activity Details</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Activity</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Sessions</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Distance</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Steps</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Duration</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Avg/Session</Text>
                    </View>
                    {data.activities.length > 0 ? (
                        data.activities.map((activity, index) => {
                            // Determine primary metric for avg/session
                            let avgSession = '-';
                            if (activity.totalDuration && activity.totalDuration > 0) {
                                avgSession = formatAvgPerSession(activity.totalDuration, activity.sessionCount);
                            } else if (activity.totalSteps && activity.totalSteps > 0) {
                                avgSession = formatNumber(Math.round(activity.totalSteps / activity.sessionCount));
                            } else if (activity.totalDistance && activity.totalDistance > 0) {
                                avgSession = `${(activity.totalDistance / activity.sessionCount).toFixed(1)} km`;
                            }

                            return (
                                <View
                                    key={index}
                                    style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                                >
                                    <Text style={[styles.tableCellBold, { flex: 2.5 }]}>
                                        {activity.activityName}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                                        {activity.sessionCount}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'center' }]}>
                                        {activity.totalDistance ? `${activity.totalDistance.toFixed(1)} km` : '-'}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'center' }]}>
                                        {activity.totalSteps ? formatNumber(activity.totalSteps) : '-'}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'center' }]}>
                                        {formatDuration(activity.totalDuration)}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'center' }]}>
                                        {avgSession}
                                    </Text>
                                </View>
                            );
                        })
                    ) : (
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 1 }]}>No activities recorded</Text>
                        </View>
                    )}
                </View>

                {/* ===== FOOTER ===== */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Generated on {formatDate(data.generatedAt)} • MyFitnessLeague
                    </Text>
                </View>
            </Page>
        </Document>
    );
}

export default LeagueReportPDF;
