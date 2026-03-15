import { Image } from 'expo-image'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { Code, Eye, FileText, Share2 } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import WebView from 'react-native-webview'
import { HeaderButton, HeaderButtonGroup } from '../../src/components/common/header-button'
import { getImageUrl } from '../../src/lib/api'
import { fontSize, radius, spacing, useColors } from '../../src/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// File extension to language mapping for syntax highlighting
const EXT_LANG_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  cs: 'csharp',
  php: 'php',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  md: 'markdown',
  toml: 'toml',
  ini: 'ini',
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  lua: 'lua',
  r: 'r',
  dart: 'dart',
}

const TEXT_CONTENT_TYPES = [
  'text/',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/typescript',
  'application/x-yaml',
  'application/toml',
]

const CODE_EXTENSIONS = new Set(Object.keys(EXT_LANG_MAP))

function getFileExtension(name: string): string {
  const parts = name.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1]! : ''
}

type PreviewMode = 'image' | 'pdf' | 'code' | 'markdown' | 'html' | 'csv' | 'text' | 'unknown'

function detectPreviewMode(ct: string, fname: string): PreviewMode {
  if (ct.startsWith('image/')) return 'image'
  if (ct === 'application/pdf') return 'pdf'

  const ext = getFileExtension(fname)
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'html' || ext === 'htm') return 'html'
  if (ext === 'csv' || ct === 'text/csv') return 'csv'
  if (ext === 'xlsx' || ext === 'xls' || ct.includes('spreadsheet')) return 'csv'
  if (CODE_EXTENSIONS.has(ext)) return 'code'
  if (TEXT_CONTENT_TYPES.some((t) => ct.startsWith(t))) return 'text'
  if (['txt', 'log', 'env', 'gitignore', 'editorconfig'].includes(ext)) return 'text'
  return 'unknown'
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default function MediaPreviewScreen() {
  const { url, filename, contentType } = useLocalSearchParams<{
    url: string
    filename: string
    contentType: string
  }>()
  const { t } = useTranslation()
  const colors = useColors()
  const navigation = useNavigation()
  const [loading, setLoading] = useState(true)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [showSource, setShowSource] = useState(false)

  const resolvedUrl = getImageUrl(url ?? '') ?? url ?? ''
  const fname = filename ?? 'file'
  const ct = contentType ?? 'application/octet-stream'
  const mode = useMemo(() => detectPreviewMode(ct, fname), [ct, fname])

  const handleShare = useCallback(async () => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(resolvedUrl)
      }
    } catch {
      // ignore
    }
  }, [resolvedUrl])

  // Fetch text content for text-based files
  useEffect(() => {
    if (
      mode === 'code' ||
      mode === 'text' ||
      mode === 'markdown' ||
      mode === 'html' ||
      mode === 'csv'
    ) {
      setLoading(true)
      fetch(resolvedUrl)
        .then((res) => res.text())
        .then((text) => {
          setTextContent(text)
          setLoading(false)
        })
        .catch(() => {
          setTextContent(null)
          setLoading(false)
        })
    }
  }, [resolvedUrl, mode])

  useEffect(() => {
    navigation.setOptions({
      title: fname || t('chat.previewTab'),
      headerRight: () => (
        <HeaderButtonGroup>
          {(mode === 'markdown' || mode === 'html') && (
            <HeaderButton
              icon={showSource ? Eye : Code}
              onPress={() => setShowSource((v) => !v)}
              color={showSource ? colors.primary : undefined}
            />
          )}
          <HeaderButton icon={Share2} onPress={handleShare} />
        </HeaderButtonGroup>
      ),
    })
  }, [navigation, fname, colors, t, handleShare, mode, showSource])

  if (mode === 'image') {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          maximumZoomScale={5}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bouncesZoom
        >
          <Image
            source={{ uri: resolvedUrl }}
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 }}
            contentFit="contain"
            transition={200}
            onLoad={() => setLoading(false)}
          />
        </ScrollView>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>
    )
  }

  if (mode === 'pdf') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <WebView
          source={{ uri: resolvedUrl }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        />
      </View>
    )
  }

  // Loading state for text content
  if (loading && textContent === null && mode !== 'unknown') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    )
  }

  // Code preview with syntax highlighting
  if (mode === 'code' && textContent !== null) {
    const ext = getFileExtension(fname)
    const lang = EXT_LANG_MAP[ext] ?? 'plaintext'
    const isDark =
      colors.background === '#000' ||
      colors.background.startsWith('#1') ||
      colors.background.startsWith('#0')
    const htmlContent = `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=3">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${isDark ? 'github-dark' : 'github'}.min.css">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
      <style>body{margin:0;padding:12px;background:${colors.background};overflow-x:auto}
      pre{margin:0;font-size:13px;line-height:1.5}code{font-family:'SF Mono',Menlo,monospace}</style>
      </head><body><pre><code class="language-${lang}">${escapeHtml(textContent)}</code></pre>
      <script>hljs.highlightAll()</script></body></html>`
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <WebView
          source={{ html: htmlContent }}
          style={styles.webview}
          originWhitelist={['*']}
          scrollEnabled
        />
      </View>
    )
  }

  // Markdown preview / source toggle
  if (mode === 'markdown' && textContent !== null) {
    if (showSource) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ScrollView style={styles.textScroll} contentContainerStyle={styles.textContent}>
            <Text style={[styles.monoText, { color: colors.text }]}>{textContent}</Text>
          </ScrollView>
        </View>
      )
    }
    const isDark =
      colors.background === '#000' ||
      colors.background.startsWith('#1') ||
      colors.background.startsWith('#0')
    const htmlContent = `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${isDark ? 'github-dark' : 'github'}.min.css">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
      <style>body{margin:0;padding:16px;background:${colors.background};color:${colors.text};font-family:-apple-system,system-ui,sans-serif;font-size:15px;line-height:1.6}
      pre{background:${isDark ? '#161b22' : '#f6f8fa'};padding:12px;border-radius:6px;overflow-x:auto}
      code{font-family:'SF Mono',Menlo,monospace;font-size:13px}
      img{max-width:100%;border-radius:8px}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid ${colors.border};padding:8px}
      blockquote{border-left:3px solid ${colors.primary};margin:0;padding-left:12px;color:${colors.textSecondary}}
      a{color:${colors.primary}}h1,h2,h3{margin-top:1.2em;margin-bottom:0.4em}</style>
      </head><body><div id="c"></div>
      <script>
        marked.setOptions({highlight:(code,lang)=>{try{return hljs.highlight(code,{language:lang||'plaintext'}).value}catch{return code}}});
        document.getElementById('c').innerHTML=marked.parse(${JSON.stringify(textContent)});
      </script></body></html>`
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <WebView source={{ html: htmlContent }} style={styles.webview} originWhitelist={['*']} />
      </View>
    )
  }

  // HTML preview / source toggle
  if (mode === 'html' && textContent !== null) {
    if (showSource) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ScrollView style={styles.textScroll} contentContainerStyle={styles.textContent}>
            <Text style={[styles.monoText, { color: colors.text }]}>{textContent}</Text>
          </ScrollView>
        </View>
      )
    }
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <WebView source={{ html: textContent }} style={styles.webview} originWhitelist={['*']} />
      </View>
    )
  }

  // CSV preview as table
  if (mode === 'csv' && textContent !== null) {
    const lines = textContent.split('\n').filter((l) => l.trim())
    const rows = lines.map((line) => {
      const cells: string[] = []
      let current = ''
      let inQuote = false
      for (const ch of line) {
        if (ch === '"') {
          inQuote = !inQuote
        } else if (ch === ',' && !inQuote) {
          cells.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
      cells.push(current.trim())
      return cells
    })
    const isDark = colors.background.startsWith('#0') || colors.background.startsWith('#1')
    const tableHtml = `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>body{margin:0;padding:8px;background:${colors.background};overflow-x:auto}
      table{border-collapse:collapse;width:max-content;min-width:100%;font-family:-apple-system,system-ui,sans-serif;font-size:13px}
      th{background:${isDark ? '#1e293b' : '#f1f5f9'};color:${colors.text};position:sticky;top:0;font-weight:600;text-align:left}
      td{color:${colors.text}}
      th,td{border:1px solid ${colors.border};padding:6px 10px;white-space:nowrap}
      tr:nth-child(even){background:${isDark ? '#111827' : '#f8fafc'}}</style>
      </head><body><table>${rows
        .map(
          (row, i) =>
            `<tr>${row.map((cell) => (i === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`)).join('')}</tr>`,
        )
        .join('')}</table></body></html>`
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <WebView source={{ html: tableHtml }} style={styles.webview} originWhitelist={['*']} />
      </View>
    )
  }

  // Plain text preview
  if (mode === 'text' && textContent !== null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.textScroll} contentContainerStyle={styles.textContent}>
          <Text style={[styles.monoText, { color: colors.text }]}>{textContent}</Text>
        </ScrollView>
      </View>
    )
  }

  // Unknown file type - show info and share button
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.filePreview}>
        <FileText size={48} color={colors.textMuted} />
        <Text style={[styles.fileTitle, { color: colors.text }]}>{fname}</Text>
        <Text style={[styles.fileType, { color: colors.textMuted }]}>{ct}</Text>
        <Pressable
          style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
          onPress={handleShare}
        >
          <Share2 size={18} color="#fff" />
          <Text style={styles.downloadBtnText}>{t('chat.downloadFile')}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flex: 1 },
  scrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textScroll: { flex: 1 },
  textContent: { padding: spacing.md },
  monoText: {
    fontFamily: 'Menlo',
    fontSize: 13,
    lineHeight: 20,
  },
  filePreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  fileTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  fileType: {
    fontSize: fontSize.sm,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
})
