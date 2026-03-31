/**
 * League Report PDF Template - 2 Page Version
 * 
 * Page 1: Summary with performance overview, challenges, points, team info
 * Page 2: Detailed activity breakdown with distances/durations, rest day dates
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
    Circle,
} from '@react-pdf/renderer';
import type { LeagueReportData } from '@/lib/services/league-report';

// ============================================================================
// Theme & Styles
// ============================================================================

const theme = {
    blueDark: '#1E3A8A',
    bluePrimary: '#2563EB',
    blueLight: '#EFF6FF',
    grayText: '#374151',
    grayLight: '#F3F4F6',
    grayMuted: '#9CA3AF',
    white: '#FFFFFF',
    accent: '#F59E0B',
    green: '#10B981',
    orange: '#F97316',
};

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        backgroundColor: theme.white,
        flexDirection: 'column',
    },
    // Header
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 4,
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
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    reportTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.blueDark,
    },
    reportSubtitle: {
        fontSize: 11,
        color: theme.grayMuted,
        marginTop: 4,
    },

    // User Info Row
    userInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.blueLight,
        padding: 14,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 5,
        borderLeftColor: theme.blueDark,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.blueDark,
    },
    teamName: {
        fontSize: 12,
        color: theme.bluePrimary,
        marginLeft: 8,
    },
    statsHighlight: {
        flexDirection: 'row',
        gap: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 9,
        color: theme.grayMuted,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.blueDark,
    },

    // Two Column Layout
    columnsContainer: {
        flexDirection: 'row',
        gap: 16,
        flex: 1,
    },
    column: {
        flex: 1,
        gap: 14,
    },

    // Section Styling
    section: {
        backgroundColor: theme.white,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.grayLight,
    },
    sectionHeader: {
        backgroundColor: theme.blueDark,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.white,
        textTransform: 'uppercase',
    },
    sectionContent: {
        padding: 12,
    },

    // Metric Row
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: theme.grayLight,
    },
    metricRowLast: {
        borderBottomWidth: 0,
    },
    metricLabel: {
        fontSize: 11,
        color: theme.grayText,
    },
    metricValue: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.blueDark,
    },

    // Challenges Badges Row
    badgesRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
    },
    badge: {
        alignItems: 'center',
        width: 70,
    },
    badgeCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    badgeNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.white,
    },
    badgeLabel: {
        fontSize: 9,
        color: theme.grayText,
        textAlign: 'center',
    },

    // Progress Bar
    progressBarContainer: {
        height: 12,
        backgroundColor: theme.grayLight,
        borderRadius: 6,
        marginTop: 4,
        marginBottom: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 6,
    },
    progressLabel: {
        fontSize: 10,
        color: theme.grayMuted,
        marginBottom: 2,
    },

    // Final Standing
    finalStandingContainer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    trophyCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    finalRankText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.blueDark,
    },
    finalPointsText: {
        fontSize: 11,
        color: theme.grayMuted,
        marginTop: 4,
    },

    // Footer
    footer: {
        textAlign: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.grayLight,
        marginTop: 'auto',
    },
    footerText: {
        fontSize: 9,
        color: theme.grayMuted,
    },

    // Page 2 - Table styles
    table: {
        width: '100%',
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: theme.blueDark,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    tableHeaderCell: {
        color: theme.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.grayLight,
    },
    tableRowAlt: {
        backgroundColor: theme.blueLight,
    },
    tableCell: {
        fontSize: 10,
        color: theme.grayText,
    },
    tableCellBold: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.blueDark,
    },

    // Rest days list
    restDaysList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    restDayChip: {
        backgroundColor: theme.blueLight,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    restDayChipText: {
        fontSize: 9,
        color: theme.blueDark,
    },

    // Page 2 title
    pageTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.blueDark,
        marginBottom: 20,
        textAlign: 'center',
    },
    brandText: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        color: theme.blueDark,
        letterSpacing: 1.5,
        marginTop: 6,
        marginBottom: 4,
    },
    
});

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatDateShort(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

function formatDuration(minutes: number | null): string {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

function getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

// ============================================================================
// SVG Icons
// ============================================================================

const TrophyIcon = ({ size = 28 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
            fill="#FFFFFF"
            d="M20.2 2H3.8c-1.1 0-2 .9-2 2v3.5c0 1.9 1.5 3.5 3.4 3.5h.3c1 2.3 3.3 3.9 6 3.9s5-1.6 6-3.9h.3c1.9 0 3.4-1.6 3.4-3.5V4c0-1.1-.9-2-2-2z"
        />
        <Path fill="#FFFFFF" d="M10 16h4v2h-4zM7 19h10v3H7z" />
    </Svg>
);

// ============================================================================
// Component: Logo
// ============================================================================

const Logo = ({ src, placeholderText }: { src: string | null, placeholderText: string }) => (
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

// ============================================================================
// Component: Section
// ============================================================================

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionContent}>
            {children}
        </View>
    </View>
);

// ============================================================================
// Component: MetricRow
// ============================================================================

const MetricRow = ({ label, value, isLast = false }: { label: string; value: string | number; isLast?: boolean }) => (
    <View style={[styles.metricRow, isLast && styles.metricRowLast]}>
        <Text style={styles.metricLabel}>{label}:</Text>
        <Text style={styles.metricValue}>{value}</Text>
    </View>
);

// ============================================================================
// Main PDF Component
// ============================================================================

interface LeagueReportPDFProps {
    data: LeagueReportData;
}

export function LeagueReportPDF({ data }: LeagueReportPDFProps) {
    // Count challenges by type
    const individualChallenges = data.challenges.filter(c => c.type === 'individual' && c.status === 'Completed').length;
    const teamChallenges = data.challenges.filter(c => c.type === 'team' && c.status === 'Completed').length;
    const subTeamChallenges = data.challenges.filter(c => c.type === 'sub_team' && c.status === 'Completed').length;

    // Calculate best streak (simplified - based on active days)
    const bestStreak = data.performance.totalActiveDays;

    // Points breakdown — workout points = total minus challenge bonus (not raw entry count)
    const challengePointsTotal = data.performance.totalChallengePoints;
    const totalPoints = data.finalIndividualScore;
    const workoutPoints = Math.max(0, totalPoints - challengePointsTotal);

    return (
        <Document>
            {/* PAGE 1: Summary */}
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <Logo src={data.league.logoUrl} placeholderText="LEAGUE" />
                    <View style={styles.headerTitleContainer}>
                    <Text style={styles.brandText}>MY FITNESS LEAGUE</Text>
                        <Text style={styles.reportTitle}>{data.league.name} Summary Report</Text>
                        <Text style={styles.reportSubtitle}>
                            {formatDate(data.league.startDate)} - {formatDate(data.league.endDate)}
                        </Text>
                    </View>
                    <Logo src={data.team?.logoUrl || null} placeholderText="TEAM" />
                </View>

                {/* User Info Row */}
                <View style={styles.userInfoRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.userName}>{data.user.username}</Text>
                        {data.team && (
                            <Text style={styles.teamName}>| {data.team.name}</Text>
                        )}
                    </View>
                    <View style={styles.statsHighlight}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Total Points</Text>
                            <Text style={styles.statValue}>{totalPoints}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Challenge Pts</Text>
                            <Text style={styles.statValue}>{challengePointsTotal}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Avg RR</Text>
                            <Text style={styles.statValue}>{data.averageRR}</Text>
                        </View>
                    </View>
                </View>

                {/* Two Column Layout */}
                <View style={styles.columnsContainer}>
                    {/* Left Column */}
                    <View style={styles.column}>
                        {/* Performance Overview */}
                        <Section title="Performance Overview">
                            <MetricRow label="Workouts Completed" value={data.performance.totalActivities} />
                            <MetricRow label="Rest Days Taken" value={`${data.restDays.total}${data.restDays.donated ? ` (+ ${data.restDays.donated} donated)` : ''}${data.restDays.received ? ` (+ ${data.restDays.received} received)` : ''}`} />
                            <MetricRow label="Active Days" value={data.performance.totalActiveDays} />
                            <MetricRow label="Missed Days" value={data.performance.totalMissedDays} />
                            <MetricRow label="Best Streak" value={`${bestStreak} Days`} isLast />
                        </Section>

                        {/* Challenges Completed */}
                        <Section title="Challenges Completed">
                            <View style={styles.badgesRow}>
                                <View style={styles.badge}>
                                    <View style={[styles.badgeCircle, { backgroundColor: theme.bluePrimary }]}>
                                        <Text style={styles.badgeNumber}>{individualChallenges}</Text>
                                    </View>
                                    <Text style={styles.badgeLabel}>Individual</Text>
                                </View>
                                <View style={styles.badge}>
                                    <View style={[styles.badgeCircle, { backgroundColor: theme.green }]}>
                                        <Text style={styles.badgeNumber}>{teamChallenges}</Text>
                                    </View>
                                    <Text style={styles.badgeLabel}>Team</Text>
                                </View>
                                <View style={styles.badge}>
                                    <View style={[styles.badgeCircle, { backgroundColor: theme.orange }]}>
                                        <Text style={styles.badgeNumber}>{subTeamChallenges}</Text>
                                    </View>
                                    <Text style={styles.badgeLabel}>Sub-Team</Text>
                                </View>
                            </View>
                        </Section>

                        {/* Final Standing */}
                        <Section title="Final Standing">
                            <View style={styles.finalStandingContainer}>
                                <View style={styles.trophyCircle}>
                                    <TrophyIcon size={32} />
                                </View>
                                <Text style={styles.finalRankText}>
                                    #{data.rankings.userRankInLeague} in League
                                </Text>
                                <Text style={styles.finalPointsText}>
                                    {totalPoints} Total Points
                                </Text>
                            </View>
                        </Section>
                    </View>

                    {/* Right Column */}
                    <View style={styles.column}>
                        {/* Points Breakdown */}
                        <Section title="Points Breakdown">
                            <View style={{ marginBottom: 10 }}>
                                <Text style={styles.progressLabel}>Workouts: {workoutPoints} pts</Text>
                                <View style={styles.progressBarContainer}>
                                    <View
                                        style={[
                                            styles.progressBar,
                                            {
                                                width: `${totalPoints > 0 ? (workoutPoints / totalPoints) * 100 : 0}%`,
                                                backgroundColor: theme.bluePrimary
                                            }
                                        ]}
                                    />
                                </View>
                            </View>
                            <View style={{ marginBottom: 10 }}>
                                <Text style={styles.progressLabel}>Challenges: {challengePointsTotal} pts</Text>
                                <View style={styles.progressBarContainer}>
                                    <View
                                        style={[
                                            styles.progressBar,
                                            {
                                                width: `${totalPoints > 0 ? (challengePointsTotal / totalPoints) * 100 : 0}%`,
                                                backgroundColor: theme.orange
                                            }
                                        ]}
                                    />
                                </View>
                            </View>
                            <MetricRow label="Total Points" value={totalPoints} isLast />
                        </Section>

                        {/* Team Info */}
                        {data.team && (
                            <Section title={data.team.name}>
                                <MetricRow label="Team Rank" value={`${data.rankings.teamRankInLeague}${getOrdinal(data.rankings.teamRankInLeague)} Place`} />
                                <MetricRow label="Your Rank in Team" value={`${data.rankings.userRankInTeam}${getOrdinal(data.rankings.userRankInTeam)} Place`} />
                                <MetricRow label="Team Score" value={`${data.finalTeamScore} Points`} isLast />
                            </Section>
                        )}

                        {/* Milestones */}
                        <Section title="Milestones">
                            <MetricRow label="Longest Streak" value={`${bestStreak} Days`} />
                            <MetricRow label="Average RR" value={data.averageRR > 0 ? data.averageRR.toFixed(2) : '-'} />
                            <MetricRow label="League Rank" value={`${data.rankings.userRankInLeague}${getOrdinal(data.rankings.userRankInLeague)} Place`} isLast />
                        </Section>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Page 1 of 2 • Generated on {formatDate(data.generatedAt)} • MyFitnessLeague
                    </Text>
                </View>
            </Page>

            {/* PAGE 2: Activity Details & Rest Days */}
            <Page size="A4" style={styles.page}>
                <Text style={styles.pageTitle}>Activity Details</Text>

                {/* Activity Breakdown Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Activity</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Sessions</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'center' }]}>Distance</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'center' }]}>Duration</Text>
                    </View>
                    {data.activities.length > 0 ? (
                        data.activities.map((activity, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.tableRow,
                                    index % 2 === 1 && styles.tableRowAlt
                                ]}
                            >
                                <Text style={[styles.tableCellBold, { flex: 2 }]}>
                                    {activity.activityName}
                                </Text>
                                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                                    {activity.sessionCount}
                                </Text>
                                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'center' }]}>
                                    {activity.totalDistance ? `${activity.totalDistance.toFixed(1)} km` :
                                        activity.totalSteps ? `${activity.totalSteps.toLocaleString()} steps` :
                                            activity.totalHoles ? `${activity.totalHoles} holes` : '-'}
                                </Text>
                                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'center' }]}>
                                    {formatDuration(activity.totalDuration)}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 1 }]}>No activities recorded</Text>
                        </View>
                    )}
                </View>

                {/* Rest Days Section */}
                <Section title={`Rest Days (${data.restDays.total} Used${data.restDays.donated ? ` • ${data.restDays.donated} Donated` : ''}${data.restDays.received ? ` • ${data.restDays.received} Received` : ''})`}>
                    {data.restDays.dates.length > 0 ? (
                        <View style={styles.restDaysList}>
                            {data.restDays.dates.map((date, index) => (
                                <View key={index} style={styles.restDayChip}>
                                    <Text style={styles.restDayChipText}>{formatDateShort(date)}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={{ fontSize: 10, color: theme.grayMuted, padding: 8 }}>
                            No rest days taken during this league.
                        </Text>
                    )}
                </Section>

                {/* Summary Stats */}
                <View style={{ marginTop: 20 }}>
                    <Section title="Summary Statistics">
                        <View style={{ flexDirection: 'row', gap: 20 }}>
                            <View style={{ flex: 1 }}>
                                <MetricRow label="Total Activities" value={data.activities.length} />
                                <MetricRow label="Total Sessions" value={data.performance.totalActivities} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <MetricRow label="Rest Days" value={data.restDays.total} />
                                <MetricRow label="Active Days" value={data.performance.totalActiveDays} isLast />
                            </View>
                        </View>
                    </Section>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Page 2 of 2 • Generated on {formatDate(data.generatedAt)} • MyFitnessLeague
                    </Text>
                </View>
            </Page>
        </Document>
    );
}

export default LeagueReportPDF;
