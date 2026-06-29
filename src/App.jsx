import { useState } from 'react'
import CatalogPage from './components/CatalogPage.jsx'
import AboutPage from './components/AboutPage.jsx'
import { I18N } from './i18n.js'

export default function App() {
  const [page, setPage] = useState('catalog')
  const [lang, setLang] = useState('ru')
  const [currency, setCurrency] = useState('uzs')

  const t = I18N[lang]

  return page === 'catalog'
    ? <CatalogPage t={t} lang={lang} setLang={setLang} currency={currency} setCurrency={setCurrency} onNav={setPage} />
    : <AboutPage t={t} lang={lang} setLang={setLang} onNav={setPage} />
}
