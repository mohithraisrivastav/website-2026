/* ==========================================================================
   Workshop cohort dates - single source of truth.

   ADD NEW DATES HERE AND NOWHERE ELSE. Cohorts whose start date has passed
   drop off the site by themselves: the schedule on workshops.html, the
   "Next Date" panel, the search-engine schema, and the registration
   dropdown all read from this file.

   Each entry needs a start (ISO), an end (ISO, same as start for one-day
   cohorts), and the label exactly as it should read on the page.
   ========================================================================== */
(function (global) {
    'use strict';

    var COHORTS = {
        '1day': [
            { start: '2026-08-09', end: '2026-08-09', label: '9 August 2026 – Goa' },
            { start: '2026-09-02', end: '2026-09-02', label: '2 September 2026 – Goa' },
            { start: '2026-11-09', end: '2026-11-09', label: '9 November 2026 – Goa' },
            { start: '2026-12-05', end: '2026-12-05', label: '5 December 2026 – Goa' },
            { start: '2027-02-01', end: '2027-02-01', label: '1 February 2027 – Goa' },
            { start: '2027-03-03', end: '2027-03-03', label: '3 March 2027 – Goa' }
        ],
        '3day': [
            { start: '2026-07-20', end: '2026-07-22', label: '20‑22 July 2026 – Goa' },
            { start: '2026-08-05', end: '2026-08-07', label: '5‑7 August 2026 – Goa' },
            { start: '2026-09-04', end: '2026-09-06', label: '4‑6 September 2026 – Goa' },
            { start: '2026-11-11', end: '2026-11-13', label: '11‑13 November 2026 – Goa' },
            { start: '2026-12-06', end: '2026-12-08', label: '6‑8 December 2026 – Goa' },
            { start: '2027-02-03', end: '2027-02-05', label: '3‑5 February 2027 – Goa' },
            { start: '2027-03-05', end: '2027-03-07', label: '5‑7 March 2027 – Goa' }
        ],
        '7day': [
            { start: '2026-10-01', end: '2026-10-06', label: '1‑6 October 2026 – Goa' },
            { start: '2027-01-09', end: '2027-01-14', label: '9‑14 January 2027 – Goa' },
            { start: '2027-04-01', end: '2027-04-06', label: '1‑6 April 2027 – Goa' }
        ]
    };

    function startOfToday() {
        var d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /* Cohorts that have not started yet, soonest first. Registration and the
       public schedule both close a cohort once its first day arrives. */
    function upcoming(type) {
        var today = startOfToday();
        return (COHORTS[type] || [])
            .filter(function (c) { return new Date(c.start + 'T00:00:00') >= today; })
            .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    }

    function next(type) {
        return upcoming(type)[0] || null;
    }

    /* Labels carry " - Goa" for the registration dropdown; the schedule
       columns sit under a heading that already says Goa. */
    function stripPlace(label) {
        return label.replace(/\s*[-\u2013\u2014]\s*Goa$/, '');
    }

    global.WorkshopCohorts = {
        all: COHORTS,
        upcoming: upcoming,
        next: next,
        stripPlace: stripPlace
    };
})(window);
