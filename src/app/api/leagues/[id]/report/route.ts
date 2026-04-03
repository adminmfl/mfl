/**
 * GET /api/leagues/[id]/report - Generate personalized league report or certificate PDF
 * 
 * Query Parameters:
 * - type: 'report' (default) | 'certificate' - Which PDF to generate
 * - format: 'pdf' (default) | 'json' - Response format
 * 
 * Returns a downloadable PDF for the authenticated user's league journey.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getLeagueReportData } from '@/lib/services/league-report';
import { renderToBuffer } from '@react-pdf/renderer';
import { LeagueReportPDF } from '@/lib/pdf/league-report-pdf';
import { CertificatePDF } from '@/lib/pdf/certificate-pdf';
import React from 'react';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: leagueId } = await params;
        const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const supabase = getSupabaseServiceRole();

        // Verify league exists and is completed
        const { data: league, error: leagueError } = await supabase
            .from('leagues')
            .select('league_id, status, end_date')
            .eq('league_id', leagueId)
            .single();

        if (leagueError || !league) {
            return NextResponse.json({ error: 'League not found' }, { status: 404 });
        }

        // Check query parameters
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'pdf';
        const type = searchParams.get('type') || 'report'; // 'report' or 'certificate'
        const startDateParam = searchParams.get('start_date');
        const endDateParam = searchParams.get('end_date');

        // Check if league is completed (either status is 'completed' or end_date has passed)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(league.end_date);
        endDate.setHours(0, 0, 0, 0);

        const isCompleted = league.status === 'completed' || today > endDate;

        // Allow dynamic reports (with date range) for active leagues
        const isDynamicReport = startDateParam || endDateParam;
        if (!isCompleted && !isDynamicReport) {
            return NextResponse.json(
                { error: 'Reports are only available for completed leagues. Use date range params for progress reports.' },
                { status: 400 }
            );
        }

        // Verify user is a member of this league
        const { data: membership, error: memberError } = await supabase
            .from('leaguemembers')
            .select('league_member_id')
            .eq('user_id', userId)
            .eq('league_id', leagueId)
            .maybeSingle();

        if (memberError || !membership) {
            return NextResponse.json(
                { error: 'You are not a member of this league' },
                { status: 403 }
            );
        }

        // Get report data with optional date range
        const reportData = await getLeagueReportData(leagueId, userId, {
            startDate: startDateParam || undefined,
            endDate: endDateParam || undefined,
        });

        if (!reportData) {
            return NextResponse.json(
                { error: 'Failed to generate report data' },
                { status: 500 }
            );
        }


        // Return JSON if requested
        if (format === 'json') {
            return NextResponse.json({
                success: true,
                data: reportData,
            });
        }

        // Generate appropriate PDF based on type
        let pdfBuffer: Buffer;
        let filename: string;

        const sanitizedLeagueName = reportData.league.name.replace(/[^a-zA-Z0-9]/g, '_');
        const sanitizedUsername = reportData.user.username.replace(/[^a-zA-Z0-9]/g, '_');

        if (type === 'certificate') {
            // Generate Certificate PDF
            pdfBuffer = await renderToBuffer(
                React.createElement(CertificatePDF, { data: reportData }) as any
            );
            filename = `Certificate_${sanitizedLeagueName}_${sanitizedUsername}.pdf`;
        } else {
            // Generate League Report PDF (default)
            pdfBuffer = await renderToBuffer(
                React.createElement(LeagueReportPDF, { data: reportData }) as any
            );
            filename = `My_League_Record_${sanitizedLeagueName}_${sanitizedUsername}.pdf`;
        }

        // Return PDF - convert Buffer to Uint8Array for NextResponse
        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error('Error generating league report:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

