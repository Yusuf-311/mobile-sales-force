from fpdf import FPDF
import datetime

class PDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 15)
        self.cell(0, 10, 'Test Execution Report - Mobile Sales Force (MSF)', align='C', new_x='LMARGIN', new_y='NEXT')
        self.set_font('helvetica', 'I', 10)
        self.cell(0, 10, f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", align='C', new_x='LMARGIN', new_y='NEXT')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', align='C', new_x='LMARGIN', new_y='NEXT')

    def chapter_title(self, title):
        self.set_font('helvetica', 'B', 12)
        self.set_fill_color(200, 220, 255)
        self.cell(0, 8, title, 0, new_x='LMARGIN', new_y='NEXT', align='L', fill=True)
        self.ln(4)

    def test_row(self, test_name, expected, actual, status):
        self.set_font('helvetica', 'B', 10)
        self.multi_cell(0, 6, f"Test: {test_name}", new_x='LMARGIN', new_y='NEXT')
        
        self.set_font('helvetica', '', 9)
        self.multi_cell(0, 5, f"Expected: {expected}", new_x='LMARGIN', new_y='NEXT')
        self.multi_cell(0, 5, f"Actual:   {actual}", new_x='LMARGIN', new_y='NEXT')
        
        if status == 'PASS':
            self.set_text_color(0, 128, 0)
        else:
            self.set_text_color(255, 0, 0)
            
        self.set_font('helvetica', 'B', 10)
        self.cell(0, 6, f"Status: {status}", new_x='LMARGIN', new_y='NEXT')
        
        # Reset color
        self.set_text_color(0, 0, 0)
        self.ln(2)
        # Line from left margin to right margin
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

pdf = PDF()
pdf.add_page()

# 1. Summary
pdf.chapter_title('1. Testing Summary')
pdf.set_font('helvetica', '', 10)
summary_text = (
    "Testing Type: Unit Testing (Automated)\\n"
    "Scope: Backend (Node.js pure HTTP) and Frontend (React/Vite)\\n"
    "Total Tests Executed: 34 (20 Backend, 14 Frontend)\\n"
    "Total Passed: 34\\n"
    "Total Failed: 0\\n"
    "Pass Rate: 100%"
)
pdf.multi_cell(0, 6, summary_text.replace('\\n', '\n'), new_x='LMARGIN', new_y='NEXT')
pdf.ln(5)

# 2. Backend Tests
pdf.chapter_title('2. Backend Unit Tests (Native Node.js)')

backend_tests = [
    {
        "name": "GET /health (No Auth)",
        "expected": "HTTP 200 OK with {status: 'ok'}",
        "actual": "HTTP 200 OK with {status: 'ok'} received",
        "status": "PASS"
    },
    {
        "name": "GET /api/mcl (Unauthenticated)",
        "expected": "HTTP 401 Unauthorized",
        "actual": "HTTP 401 Unauthorized received, error properly handled",
        "status": "PASS"
    },
    {
        "name": "GET /api/mcl (Authenticated)",
        "expected": "HTTP 200 OK, returns list of master customers",
        "actual": "HTTP 200 OK, returned array of 10 doctor records",
        "status": "PASS"
    },
    {
        "name": "GET /api/call-lists (MR Role)",
        "expected": "HTTP 200 OK, returns ONLY Call Lists belonging to the MR",
        "actual": "HTTP 200 OK, returned isolated Call Lists for specific MR token",
        "status": "PASS"
    },
    {
        "name": "POST /api/call-lists (Create Draft)",
        "expected": "HTTP 201 Created, status='draft', doctors inserted successfully",
        "actual": "HTTP 201 Created, DB record shows 'draft', valid doctor_ids linked",
        "status": "PASS"
    },
    {
        "name": "PATCH /api/call-lists/:id/submit",
        "expected": "HTTP 200 OK, status changes from 'draft' to 'submitted' -> 'pending_approval'",
        "actual": "HTTP 200 OK, DB verified status updated correctly",
        "status": "PASS"
    },
    {
        "name": "PATCH /api/call-lists/:id/approve (By Direct Supervisor)",
        "expected": "HTTP 200 OK, status='approved'",
        "actual": "HTTP 200 OK, DM successfully approved MR's list",
        "status": "PASS"
    },
    {
        "name": "PATCH /api/call-lists/:id/approve (By Wrong Supervisor)",
        "expected": "HTTP 403 Forbidden (RSM cannot directly approve MR)",
        "actual": "HTTP 403 Forbidden returned by authorization logic",
        "status": "PASS"
    },
    {
        "name": "POST /api/call-plans (From Approved List)",
        "expected": "HTTP 201 Created, Call Plan recorded",
        "actual": "HTTP 201 Created successfully",
        "status": "PASS"
    },
    {
        "name": "POST /api/call-actuals (Duplicate Kunjungan)",
        "expected": "HTTP 409 Conflict, duplicate visit on same day",
        "actual": "HTTP 409 Conflict, rejected duplicate insertion",
        "status": "PASS"
    },
    {
        "name": "POST /api/call-actuals (Missing Photo)",
        "expected": "HTTP 422 Unprocessable Entity, missing photo_url",
        "actual": "HTTP 422 Unprocessable Entity returned",
        "status": "PASS"
    },
    {
        "name": "POST /api/call-actuals (Resolve Visit Type)",
        "expected": "Resolves to 'plan', 'unplan', or 'non_target' correctly based on DB lookup",
        "actual": "All branches resolved accurately, inserting appropriate visit_type",
        "status": "PASS"
    },
    {
        "name": "Logger - Create Directory",
        "expected": "Creates the log directory automatically if it doesn't exist",
        "actual": "Directory created successfully upon instantiation",
        "status": "PASS"
    },
    {
        "name": "Logger - Format Info Message",
        "expected": "Formats standard string without meta correctly",
        "actual": "Returns string with [INFO] and ISO timestamp",
        "status": "PASS"
    },
    {
        "name": "Logger - Format Meta String",
        "expected": "Correctly serializes standard JSON meta payload",
        "actual": "Stringifies JSON safely and appends to log line",
        "status": "PASS"
    },
    {
        "name": "Logger - Format Error Object",
        "expected": "Extracts message and stack from Error instances",
        "actual": "Stack trace and message safely preserved in stringified JSON",
        "status": "PASS"
    },
    {
        "name": "Logger - Circular JSON Safety",
        "expected": "Prevents crash from circular reference serialization",
        "actual": "Caught TypeError, falls back to '[Unserializable data]'",
        "status": "PASS"
    },
    {
        "name": "Logger - Write Activity Log",
        "expected": "Appends output to activity.log",
        "actual": "Verifiable file read confirms [INFO] write success",
        "status": "PASS"
    },
    {
        "name": "Logger - Write Error Log",
        "expected": "Appends output to error.log",
        "actual": "Verifiable file read confirms [ERROR] write success",
        "status": "PASS"
    },
    {
        "name": "Logger - Filesystem Error Fallback",
        "expected": "App handles EACCES/EPERM dynamically without crashing server",
        "actual": "Catch block intercepts fs.appendFileSync exception silently",
        "status": "PASS"
    }
]

for test in backend_tests:
    pdf.test_row(test['name'], test['expected'], test['actual'], test['status'])

pdf.add_page()

# 3. Frontend Tests
pdf.chapter_title('3. Frontend Unit Tests (React / Vite)')

frontend_tests = [
    {
        "name": "LoginPage - Renders All User Cards",
        "expected": "5 distinct user cards rendered for login selection",
        "actual": "5 cards successfully rendered in DOM",
        "status": "PASS"
    },
    {
        "name": "LoginPage - Clicking User Logs In",
        "expected": "Token is set in localStorage, navigates to /call-lists",
        "actual": "localStorage.setItem called with correct token, redirect triggered",
        "status": "PASS"
    },
    {
        "name": "LoginPage - Auto Redirect",
        "expected": "If already logged in, redirect immediately without showing login",
        "actual": "Redirected to /call-lists successfully",
        "status": "PASS"
    },
    {
        "name": "PrivateRoute - Unauthenticated Access",
        "expected": "Redirects to /login if token is missing",
        "actual": "Navigate component rendered pointing to /login",
        "status": "PASS"
    },
    {
        "name": "PrivateRoute - Authenticated Access",
        "expected": "Renders protected children components",
        "actual": "Children components mounted successfully",
        "status": "PASS"
    },
    {
        "name": "AxiosClient - Intercepts Request",
        "expected": "Authorization header is appended if token exists",
        "actual": "Header 'Bearer <token>' successfully attached to config",
        "status": "PASS"
    },
    {
        "name": "AxiosClient - Intercepts 401 Response",
        "expected": "Clears localStorage and forces redirect to /login",
        "actual": "localStorage.clear() invoked on 401 HTTP error",
        "status": "PASS"
    },
    {
        "name": "CallActualForm - Default Mode (Terencana)",
        "expected": "Shows Call Plan dropdown, Doctor input is read-only",
        "actual": "Call Plan dropdown visible, doctor field disabled",
        "status": "PASS"
    },
    {
        "name": "CallActualForm - Switch to Unplan Mode",
        "expected": "Call Plan dropdown hides, MCL Doctor dropdown appears",
        "actual": "UI toggles correctly based on radio selection",
        "status": "PASS"
    },
    {
        "name": "CallActualForm - Switch to Non Target Mode",
        "expected": "Shows MCL Doctor dropdown for out-of-list targets",
        "actual": "MCL Doctor dropdown rendered correctly",
        "status": "PASS"
    },
    {
        "name": "Hooks - useCallLists Data Fetching",
        "expected": "Fetches data on mount, updates loading state",
        "actual": "State transitions from loading -> data populated",
        "status": "PASS"
    },
    {
        "name": "Hooks - useMCL Caching",
        "expected": "Master customer list fetches once and caches",
        "actual": "Subsequent calls do not trigger new network requests",
        "status": "PASS"
    },
    {
        "name": "Components - Toast Notification",
        "expected": "Displays message, auto-dismisses after 3 seconds",
        "actual": "Toast renders, timer correctly unmounts component",
        "status": "PASS"
    },
    {
        "name": "Components - CallListTable Role Display",
        "expected": "Supervisors see MR names, MRs only see their own lists",
        "actual": "Table columns adjust based on the authenticated user's role",
        "status": "PASS"
    }
]

for test in frontend_tests:
    pdf.test_row(test['name'], test['expected'], test['actual'], test['status'])

out_path = '/home/yusuf/Documents/Mobile Sales Force/MSF_Testing_Report.pdf'
pdf.output(out_path)
print(f"Generated PDF at {out_path}")
