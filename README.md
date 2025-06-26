# LinkedIn Liker Insights Chrome Extension

A powerful Chrome extension that extracts and analyzes LinkedIn post engagement data, providing detailed insights about users who have liked your posts. Perfect for networking, lead generation, and audience analysis.

## 🚀 Features

### Core Functionality
- **Post Analysis**: Scan any LinkedIn post to extract users who have liked it
- **Profile Extraction**: Automatically collect basic profile information (name, title, profile URL)
- **Advanced Profile Analysis**: Deep-dive into user profiles to extract:
  - Location information
  - About section content
  - Professional experience details
- **Data Export**: Export collected data in CSV or JSON formats
- **Modern UI**: Beautiful, responsive interface with glassmorphism design

### Key Capabilities
- ✅ Extract likers from LinkedIn posts
- ✅ Automated profile analysis with background processing
- ✅ Location, About, and Experience data extraction
- ✅ Progress tracking during analysis
- ✅ Data persistence across sessions
- ✅ Pop-up and full-tab viewing modes
- ✅ Export to CSV and JSON formats
- ✅ Modal popup for detailed profile viewing

## 📥 Installation

### Development Installation
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your Chrome toolbar

### Build the Extension
```bash
# Install dependencies
npm install

# Build the extension
npm run build

# The built extension will be in the dist/ folder
```

## 🎯 Usage

### Step 1: Navigate to a LinkedIn Post
1. Go to LinkedIn and find a post you want to analyze
2. The post must have visible likes/reactions

### Step 2: Open the Extension
1. Click the extension icon in your Chrome toolbar
2. Or use the keyboard shortcut (if configured)

### Step 3: Scan for Likers
1. Click the "Scan LinkedIn Post" button
2. The extension will automatically detect and extract users who liked the post
3. Basic information (name, title, profile URL) will be displayed in a table

### Step 4: Analyze Profiles (Optional)
1. Click "Analyze Profiles" to extract detailed information
2. The extension will:
   - Open each profile in a background tab
   - Extract location, about section, and experience data
   - Store the enhanced data automatically
3. Progress is shown during the analysis process

### Step 5: View and Export Data
1. **View Details**: Click on any name in the table to open a detailed modal
2. **Export Data**: Use the CSV or JSON export buttons
3. **Open in Tab**: Click "Open in Tab" for a full-screen experience

## 📊 Data Fields

### Basic Profile Data
- **Name**: User's display name
- **Title**: Professional title/headline
- **Profile URL**: Direct link to LinkedIn profile

### Enhanced Profile Data (After Analysis)
- **Location**: Geographic location
- **About**: Professional summary/about section
- **Experience**: Work history with:
  - Job titles
  - Company names
  - Employment dates
  - Job descriptions

## 🛠️ Technical Details

### Architecture
- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS with custom glassmorphism design
- **Background Processing**: Chrome Extension APIs
- **Data Storage**: Chrome local storage
- **Build System**: Vite

### File Structure
```
linkedin-liker-insights-extension/
├── components/           # React components
│   ├── LikerCard.tsx
│   ├── LikerInputForm.tsx
│   ├── LikersReviewSection.tsx
│   └── PostDisplay.tsx
├── services/            # Service modules
│   └── geminiService.ts
├── icons/              # Extension icons
├── App.tsx             # Main application
├── background.ts       # Background script
├── content_script.ts   # Content script
├── manifest.json       # Extension manifest
└── types.ts           # TypeScript definitions
```

### Key Technologies
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Chrome Extension Manifest V3**: Latest extension platform
- **Vite**: Fast build tool and dev server

## 🔧 Configuration

### Permissions Required
- `activeTab`: Access to current tab content
- `storage`: Local data persistence
- `tabs`: Tab management for profile analysis
- `scripting`: Content script injection

### Storage
The extension uses Chrome's local storage to persist:
- Basic profile data (`linkedin_likers_data`)
- Enhanced profile data (`linkedin_detailed_profiles`)
- Timestamps for data freshness

## 📈 Performance

### Optimization Features
- **Background Processing**: Profile analysis runs in background tabs
- **Rate Limiting**: 4-second delays between profile requests
- **Timeout Handling**: 30-second timeout for each profile
- **Error Recovery**: Graceful handling of failed extractions
- **Memory Efficient**: Automatic cleanup of background tabs

### Scalability
- Handles dozens of profiles efficiently
- Progress tracking for long operations
- Asynchronous processing prevents UI blocking

## 🎨 UI/UX Features

### Modern Design
- **Glassmorphism Effects**: Frosted glass appearance
- **Gradient Backgrounds**: Beautiful color transitions
- **Responsive Design**: Works on different screen sizes
- **Hover Animations**: Interactive button states
- **Loading States**: Clear feedback during operations

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Compatible**: Proper ARIA labels
- **High Contrast**: Readable color combinations
- **Icon + Text**: Clear visual and textual indicators

## 🔒 Privacy & Ethics

### Data Handling
- **Local Storage Only**: All data stays on your device
- **No External APIs**: Direct LinkedIn interaction only
- **User Consent**: Manual initiation of all data collection
- **Respect Rate Limits**: Built-in delays to avoid overwhelming LinkedIn

### Ethical Usage
- ✅ Personal networking and research
- ✅ Business lead generation
- ✅ Audience analysis for content creators
- ❌ Spam or unsolicited outreach
- ❌ Data harvesting for commercial sale
- ❌ Violation of LinkedIn's Terms of Service

## 📝 Development

### Setup Development Environment
```bash
# Clone the repository
git clone <repository-url>
cd linkedin-liker-insights-extension

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🐛 Troubleshooting

### Common Issues

**Extension not working on LinkedIn**
- Ensure you're on a LinkedIn post page
- Refresh the page and try again
- Check if LinkedIn has updated their structure

**Profile analysis fails**
- LinkedIn may have rate limiting
- Try with fewer profiles
- Wait a few minutes before retrying

**Data not persisting**
- Check Chrome storage permissions
- Try clearing extension data and rescanning

**Export not working**
- Ensure pop-up blockers are disabled
- Try the "Open in Tab" option instead

### Debug Mode
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for extension logs prefixed with background script messages

## 📄 License

This project is for educational and personal use. Please respect LinkedIn's Terms of Service and use responsibly.

## 🔄 Version History

### v1.0.0 (Current)
- Initial release
- Basic profile extraction
- Enhanced profile analysis
- Modern UI design
- CSV/JSON export
- Data persistence


---

**⚠️ Disclaimer**: This extension is not affiliated with LinkedIn. Use responsibly and in accordance with LinkedIn's Terms of Service.
