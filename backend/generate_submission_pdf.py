from fpdf import FPDF
import os

pdf_path = r"C:\Users\Kush Shah\.gemini\antigravity\brain\2daf0adc-ace8-46c8-b17c-45a423df05af\DuHacks_Submission.pdf"

class PDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 15)
        self.cell(0, 10, 'OptiWealth - DuHacks Submission', align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

    def chapter_title(self, label):
        self.set_font('Helvetica', 'B', 12)
        self.set_fill_color(200, 220, 255)
        self.cell(0, 6, label, new_x="LMARGIN", new_y="NEXT", fill=True)
        self.ln(4)

    def chapter_body(self, body):
        self.set_font('Helvetica', '', 11)
        self.multi_cell(0, 6, body)
        self.ln()

pdf = PDF()
pdf.add_page()

# Content
# 1. The problem it solves
pdf.chapter_title('The problem it solves')
pdf.chapter_body("""In the current Indian financial landscape, retail investors often struggle with fragmented portfolios spreads across various brokerages and asset classes. While it is easy to buy stocks or mutual funds, understanding the "true health" of a portfolio is surprisingly difficult.

Most investors face three core problems:
1. The Fragmentation Chaos: Tracking net worth requires logging into multiple apps (Zerodha, Groww, bank accounts), making it impossible to see the big picture in real-time.
2. The Rebalancing Puzzle: Investors know they should "buy low and sell high" to maintain their desired risk profile (e.g., 60% Equity, 40% Debt), but calculating exactly how many units to sell or buy to get back to that target is a complex mathematical problem that most avoid.
3. Hidden Risk: Without a unified view, investors often unknowingly overexpose themselves to specific sectors or high-volatility assets, realizing the danger only when the market corrects.

OptiWealth solves these by acting as an intelligent, centralized portfolio command center. It doesn't just track prices; it actively calculates portfolio drift. By comparing a user's current allocation against their target risk profile, OptiWealth generates precise, actionable rebalancing recommendations. It democratizes the kind of sophisticated portfolio management that was previously available only to high-net-worth individuals with private wealth managers.""")

# 2. Challenges I ran into
pdf.chapter_title('Challenges I ran into')
pdf.chapter_body("""Building OptiWealth threw several complex technical hurdles at us, particularly in securing the authentication flow and managing real-time data.

The Google Authentication & Database Sync
One of the trickiest bugs I encountered was integrating Google OAuth2 with our custom FastAPI backend. I initially faced a persistent "Invalid Token" error that seemed inexplicable. It turned out to be a subtle mismatch between the Client ID configured in the Next.js frontend and the one the backend was using for verification. Even after fixing the configuration, the application crashed because our PostgreSQL database schema hadn't updated to store the google_id. I had to write a custom Python migration script to manually alter the live database tables without losing existing user data, adding the necessary columns to link social accounts to existing email profiles seamlessly.

Responsive Data Visualization
Designing a data-heavy financial dashboard that looks beautiful on a mobile screen was a massive design challenge. Our initial "Neumorphic" cards looked great on desktop but overlapped and broke layout on smaller devices. I spent significant time refining the CSS grid systems and creating adaptive components - like the specialized Navigation Bar that intelligently resizes logos and buttons to ensure the "Sign In" and "Get Started" calls-to-action are always accessible, regardless of the device width.

Balancing Security with UX
Implementing Multi-Factor Authentication (MFA) using Time-based One-Time Passwords (TOTP) was essential for a fintech app, but it often adds friction. The challenge was ensuring that legitimate users weren't locked out during the setup process. I had to architect a session-based temporary token system that allows users to verify their TOTP device before fully committing the changes to their account settings, preventing the "locked out" scenario that happens if a user scans a QR code but fails to enter the OTP correctly.""")

# 3. Tracks Applied
pdf.chapter_title('Tracks Applied')
pdf.chapter_body("""- FinTech / WealthTech: Democratizing professional-grade portfolio verification and rebalancing tools.
- Open Innovation: Building a modular, API-first architecture that can integrate with various data sources.""")

pdf.add_page()

# 4. Video Script
pdf.chapter_title('Video Explanation Script')
pdf.set_font('Helvetica', 'I', 10)
pdf.cell(0, 5, 'Duration: Approx. 2-3 Minutes', new_x="LMARGIN", new_y="NEXT")
pdf.ln(5)

pdf.set_font('Helvetica', 'B', 11)
pdf.cell(0, 6, '[0:00-0:30] Introduction & The "Why"', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', '', 11)
pdf.multi_cell(0, 6, """Visual: Fast-paced montage of stock market charts, stressed person looking at multiple finance apps, then cut to the clean OptiWealth Landing page.
Audio: "We all want to grow our wealth, but managing a portfolio today is a mess. You have stocks in one app, mutual funds in another, and no idea if you're actually on track. Investors know they need to rebalance, but the math is hard, so they just... don't. Introducing OptiWealth--your intelligent portfolio co-pilot." """)
pdf.ln(3)

pdf.set_font('Helvetica', 'B', 11)
pdf.cell(0, 6, '[0:30-1:00] Seamless Onboarding & Security', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', '', 11)
pdf.multi_cell(0, 6, """Visual: Show the Login Page. Click "Sign in with Google". Show the instant redirect to Dashboard. Then briefly flash the Settings page showing MFA (Two-Factor Authentication) enabled.
Audio: "Security is paramount in fintech. We've built a robust authentication system supporting Google Sign-In for friction-less access, backed by Time-based One-Time Password (TOTP) MFA. Your financial data stays locked down, accessible only to you." """)
pdf.ln(3)

pdf.set_font('Helvetica', 'B', 11)
pdf.cell(0, 6, '[1:00-1:45] The Core Feature: Dashboard & Analytics', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', '', 11)
pdf.multi_cell(0, 6, """Visual: Scroll through the Dashboard. Hover over the beautiful charts. Show the Asset Allocation pie chart. Switch to Mobile view (using browser dev tools) to show off the responsive design.
Audio: "Once inside, OptiWealth gives you immediate clarity. Our adaptive dashboard aggregates your holdings into a single, crystal-clear view. Whether you're on your laptop or checking your phone on the go, our fully responsive glassmorphism design ensures you always have the full picture. You can see your real-time net worth, asset distribution, and risk metrics at a glance." """)
pdf.ln(3)

pdf.set_font('Helvetica', 'B', 11)
pdf.cell(0, 6, '[1:45-2:30] The "Magic": Rebalancing', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', '', 11)
pdf.multi_cell(0, 6, """Visual: Navigate to the "Rebalance" or "Analytics" tab. Show a portfolio that is "Drifting" (e.g., too much Equity). Show the system suggesting specific "Sell" and "Buy" orders to fix it.
Audio: "But we don't just show you data; we tell you what to do with it. This is our Rebalancing Engine. It constantly monitors your portfolio drift. If your stock allocation gets too high, OptiWealth calculates the exact mathematical moves needed to restore your target risk profile. It takes the guesswork out of 'buy low, sell high'." """)
pdf.ln(3)

pdf.set_font('Helvetica', 'B', 11)
pdf.cell(0, 6, '[2:30-3:00] Conclusion', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', '', 11)
pdf.multi_cell(0, 6, """Visual: Return to Landing Page. Show the "Get Started" button pulsing.
Audio: "OptiWealth transforms portfolio management from a chore into a science. It's time to stop guessing and start optimizing. Built with Next.js, FastAPI, and banking-grade security--this is the future of personal wealth management." """)


# Output
try:
    pdf.output(pdf_path)
    print(f"PDF successfully generated at: {pdf_path}")
except Exception as e:
    print(f"Error generating PDF: {e}")
