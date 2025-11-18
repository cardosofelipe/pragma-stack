# Internationalization (i18n) Implementation Plan
## State-of-the-Art Next.js 15 + FastAPI i18n System (2025)

**Last Updated**: 2025-11-17
**Status**: ✅ Approved - Ready for Implementation
**Languages**: English (en) - Default, Italian (it) - Showcase

---

## 📋 EXECUTIVE SUMMARY

This document provides a comprehensive plan for implementing production-grade internationalization (i18n) in the FastNext Template. The implementation showcases best practices with 2 languages (English and Italian), making it easy for users to extend with additional languages.

### Technology Stack (2025 Best Practices)

- **Frontend**: next-intl 4.0 (ESM, TypeScript-first, App Router native)
- **Backend**: FastAPI with BCP 47 locale storage in PostgreSQL
- **Testing**: Playwright (parameterized locale tests) + Jest (i18n test utils)
- **SEO**: Automatic hreflang tags, sitemap generation, metadata per locale
- **Validation**: Automated translation key validation in CI/CD

### Why Only 2 Languages?

This is a **template showcase**, not a production deployment:

✅ Clean example of i18n implementation
✅ Easy to understand patterns
✅ Users can add languages by copying the Italian example
✅ Faster testing and implementation
✅ Smaller bundle size for demonstration

### Quality Standards

- ✅ **Test Coverage**: Backend ≥97%, comprehensive E2E tests
- ✅ **Zero Breaking Changes**: All existing 743 backend + 56 frontend tests must pass
- ✅ **Type Safety**: Full autocomplete for translation keys
- ✅ **Performance**: Core Web Vitals maintained (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- ✅ **SEO**: Lighthouse SEO score 100 for both locales
- ✅ **GDPR Compliant**: User locale preferences handled appropriately

---

## 🎯 IMPLEMENTATION PHASES

### Phase 0: Documentation & Planning (2 hours)
- Create this implementation plan document
- Document architecture decisions

### Phase 1: Backend Foundation (4 hours)
- Add `locale` column to User model
- Create database migration
- Update Pydantic schemas
- Create locale detection dependency
- Add backend tests

### Phase 2: Frontend Setup (4 hours)
- Install and configure next-intl
- Create translation files (EN, IT)
- Configure TypeScript autocomplete
- Restructure App Router for [locale] pattern
- Fix tests

### Phase 3: Component Translation (4 hours)
- Create LocaleSwitcher component
- Translate auth components
- Translate navigation components
- Translate settings components
- Review and test

### Phase 4: SEO & Metadata (3 hours)
- Implement locale-aware metadata
- Generate multilingual sitemap
- Configure robots.txt
- SEO validation

### Phase 5: Performance Optimization (3 hours)
- Measure Core Web Vitals baseline
- Optimize translation loading
- Prevent CLS with font loading
- Performance validation

### Phase 6: Comprehensive Testing (4 hours)
- Backend integration tests
- Frontend E2E locale tests
- Frontend unit tests
- Translation validation automation

### Phase 7: Documentation & Polish (2 hours)
- Update technical documentation
- Create migration guide
- Final SEO and performance validation

### Phase 8: Deployment Prep (2 hours)
- Update README
- Create release notes
- Deployment checklist

**Total Time**: ~28 hours (~3.5 days) + 20% buffer = **4 days**

---

## 🏗️ ARCHITECTURE DECISIONS

### 1. Locale Format: BCP 47

**Decision**: Use BCP 47 language tags (e.g., "en", "it", "en-US", "it-IT")

**Rationale**:
- Industry standard (used by HTTP Accept-Language, HTML lang attribute, ICU libraries)
- Based on ISO 639-1 (language) + ISO 3166-1 (region)
- Flexible: start simple with 2-letter codes, add region qualifiers when needed
- Future-proof for dialects and scripts (e.g., "zh-Hans" for Simplified Chinese)

**Implementation**:
```python
# Backend validation
SUPPORTED_LOCALES = {"en", "it", "en-US", "en-GB", "it-IT"}
```

---

### 2. URL Structure: Subdirectory

**Decision**: `/[locale]/[path]` format (e.g., `/en/about`, `/it/about`)

**Alternatives Considered**:
- ❌ Subdomain (`en.example.com`) - Too complex for template
- ❌ Country-code TLD (`example.it`) - Too expensive, not needed for template
- ❌ URL parameters (`?lang=en`) - Poor SEO, harder to crawl

**Rationale**:
- ✅ **Best SEO**: Google explicitly recommends subdirectories for most sites
- ✅ **Simple Infrastructure**: Single domain, single deployment
- ✅ **Low Cost**: No multiple domain purchases
- ✅ **Easy to Maintain**: Centralized analytics and tooling
- ✅ **Clear URLs**: Users can easily switch locales by changing URL

**SEO Benefits**:
- Domain authority consolidates to one domain
- Backlinks benefit all language versions
- Easier to build authority than multiple domains
- Works seamlessly with hreflang tags

---

### 3. Database Schema: Dedicated `locale` Column

**Decision**: Add `locale VARCHAR(10)` column to `users` table, NOT JSONB

**Alternatives Considered**:
- ❌ Store in `preferences` JSONB field - 2-10x slower queries, no optimizer statistics

**Rationale**:
- ✅ **Performance**: B-tree index vs GIN index (smaller, faster)
- ✅ **Query Optimization**: PostgreSQL can maintain statistics on column values
- ✅ **Disk Space**: JSONB stores keys repeatedly (inefficient for common fields)
- ✅ **Update Performance**: Updating JSONB requires rewriting entire field + indexes

**Schema**:
```sql
ALTER TABLE users ADD COLUMN locale VARCHAR(10) DEFAULT NULL;
CREATE INDEX ix_users_locale ON users(locale);
```

**Why Nullable?**
- Distinguish "never set" (NULL) from "explicitly set to English"
- Allows lazy loading on first request (more accurate than backfilling)

**Why No Database DEFAULT?**
- Application-level default provides more flexibility
- Can implement locale detection logic (Accept-Language header)
- Easier to change default without migration

---

### 4. Locale Detection Priority

**Decision**: Three-tier fallback system

1. **User's Saved Preference** (highest priority)
   - If authenticated and `user.locale` is set, use it
   - Persists across sessions and devices

2. **Accept-Language Header** (second priority)
   - For unauthenticated users
   - Parse `Accept-Language: it-IT,it;q=0.9,en;q=0.8` → "it-IT"
   - Validate against supported locales

3. **Default to English** (fallback)
   - If no user preference and no header match

**Implementation** (Backend):
```python
async def get_locale(
    request: Request,
    current_user: User | None = Depends(get_optional_current_user)
) -> str:
    if current_user and current_user.locale:
        return current_user.locale

    accept_language = request.headers.get("accept-language", "")
    if accept_language:
        locale = accept_language.split(',')[0].split(';')[0].strip()
        lang_code = locale.split('-')[0].lower()
        if lang_code in {"en", "it"}:
            return locale.lower()

    return "en"
```

---

### 5. Translation Storage: Server-Side Only (next-intl)

**Decision**: Use next-intl's server-component pattern, NOT client-side translation loading

**Rationale**:
- ✅ **Zero Client Bundle Overhead**: Translations never sent to browser
- ✅ **Instant Page Loads**: No translation parsing on client
- ✅ **Better SEO**: Fully rendered HTML for search engines
- ✅ **Reduced Bandwidth**: Especially important for mobile users

**Implementation**:
```typescript
// Server Component (preferred 95% of the time)
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('HomePage');
  return <h1>{t('title')}</h1>;
}

// Client Component (only when needed for interactivity)
'use client';
import { useTranslations } from 'next-intl';

export function LoginForm() {
  const t = useTranslations('auth.Login');
  return <form>{/* ... */}</form>;
}
```

**Performance Impact**:
- next-intl core: ~9.2kb gzipped
- Translation files: 0kb on client (server-side only)
- Tree-shaking: Automatic with ESM build

---

### 6. Translation File Structure: Nested Namespaces

**Decision**: Use nested JSON structure with namespaces, not flat keys

**Bad (Flat)**:
```json
{
  "auth_login_title": "Sign in",
  "auth_login_email_label": "Email",
  "auth_register_title": "Sign up"
}
```

**Good (Nested)**:
```json
{
  "auth": {
    "Login": {
      "title": "Sign in",
      "emailLabel": "Email"
    },
    "Register": {
      "title": "Sign up"
    }
  }
}
```

**Rationale**:
- ✅ **Better Organization**: Logical grouping by feature
- ✅ **Easier Maintenance**: Find related translations quickly
- ✅ **Type Safety**: Full autocomplete with TypeScript integration
- ✅ **Scalability**: Easy to split into separate files later

**Usage**:
```typescript
const t = useTranslations('auth.Login');
t('title');  // "Sign in"
t('emailLabel');  // "Email"
```

---

### 7. SEO Strategy: Hreflang + Sitemap + Metadata

**Decision**: Dual implementation for comprehensive SEO

**1. HTML `<link>` Tags** (via `generateMetadata`):
```typescript
export async function generateMetadata({ params: { locale } }) {
  return {
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'x-default': '/en',
        'en': '/en',
        'it': '/it',
      },
    },
  };
}
```

**2. XML Sitemap** (with hreflang):
```typescript
export default function sitemap() {
  return routes.flatMap(route =>
    locales.map(locale => ({
      url: `${baseUrl}/${locale}${route.path}`,
      alternates: {
        languages: { en: `/en${route.path}`, it: `/it${route.path}` }
      }
    }))
  );
}
```

**Why Both?**
- HTML tags: Google's preferred method for page-level precision
- Sitemap: Helps discovery, provides backup if HTML tags malfunction
- **Never use HTTP headers** - avoid confusion with mixed methods

**x-default Locale**:
- Points to English (`/en`) as fallback for unsupported locales
- Used when user's language doesn't match any hreflang tags

---

### 8. Testing Strategy: Smoke Tests + Parameterization

**Decision**: Don't test all translations, test the i18n mechanism works

**Backend Tests**:
- 10 new integration tests covering locale CRUD, validation, detection
- Test both EN and IT locale values
- Test Accept-Language header parsing

**Frontend E2E Tests**:
- 12 new parameterized tests for locale switching
- Test critical flows in both EN and IT (login, register)
- **NOT** duplicating all 56 existing tests per locale
- Use parameterization: `for (const locale of ['en', 'it']) { test(...) }`

**Frontend Unit Tests**:
- 8 new component tests with i18n wrappers
- Test LocaleSwitcher functionality
- Test translated components render correctly

**Translation Validation**:
- Automated CI check for missing keys
- Validate Italian has all keys that English has
- Detect unused keys

**Rationale**:
- ✅ **Efficient**: Test mechanism, not content
- ✅ **Maintainable**: Adding Italian tests doesn't double test time
- ✅ **Comprehensive**: Critical paths tested in both locales
- ✅ **Fast CI**: ~13-18 minutes total (vs 60+ if we duplicate everything)

---

### 9. Performance Budget

**Core Web Vitals Targets** (both EN and IT):
- **LCP** (Largest Contentful Paint): < 2.5s
- **INP** (Interaction to Next Paint): < 200ms
- **CLS** (Cumulative Layout Shift): < 0.1

**Bundle Size Impact**:
- next-intl: ~9.2kb gzipped (acceptable)
- Translation files: 0kb on client (server-side)
- Total increase: < 15kb

**Lighthouse Scores**:
- Performance: ≥ 90
- Accessibility: ≥ 95
- SEO: 100

**Font Loading Strategy**:
- Use `display: swap` to prevent CLS
- Preload Inter font with Latin + Latin-ext subsets (for Italian accents: à, è, ì, ò, ù)
- Fallback to system fonts

---

### 10. GDPR Compliance

**Classification**: User locale preference IS personal data (GDPR Article 4)

**Lawful Basis**: Legitimate interest (service improvement) ✅

**User Rights**:
- ✅ **Access**: User can view locale in profile (GET /users/me)
- ✅ **Rectification**: User can update locale (PATCH /users/me)
- ✅ **Erasure**: Locale deleted when user deleted (CASCADE)
- ✅ **Portability**: Included in user data export

**Privacy Policy Requirements**:
- "We store your language preference to personalize your experience"
- "You can change this in Settings > Profile at any time"

**Data Minimization**: ✅ PASS
- Locale is necessary for service personalization
- No excessive data collection (not storing geolocation)

---

## 🚀 GETTING STARTED

### For Developers Implementing This Plan

1. **Read This Document**: Understand the architecture decisions and rationale
2. **Follow Phases Sequentially**: Each phase builds on the previous
3. **Run Tests After Each Phase**: Ensure no regressions
4. **Use Parallel Agents**: Where indicated in the plan for efficiency
5. **Document Decisions**: Update this file if you deviate from the plan

### For Users of the Template

1. **See `/docs/I18N.md`**: User-facing guide on using i18n
2. **See `/docs/I18N_MIGRATION_GUIDE.md`**: Deploying to existing projects
3. **Adding Languages**: Copy the Italian example, follow `/docs/I18N.md`

---

## 📚 REFERENCES

### Official Documentation
- [next-intl](https://next-intl.dev) - Next.js 15 i18n library
- [BCP 47 Language Tags](https://www.rfc-editor.org/rfc/bcp/bcp47.txt) - Locale format standard
- [Google Multilingual SEO](https://developers.google.com/search/docs/specialty/international) - SEO guidelines

### Research Sources
- next-intl 4.0 release notes (2025)
- Next.js 15 App Router i18n patterns
- PostgreSQL performance: JSONB vs columns
- Lighthouse CI best practices
- Playwright i18n testing patterns

---

## ✅ COMPLETION CHECKLIST

Use this checklist to verify implementation is complete:

### Backend
- [ ] `locale` column added to `users` table
- [ ] Database migration created and tested
- [ ] Pydantic schemas updated (UserUpdate, UserResponse)
- [ ] Locale detection dependency created
- [ ] 10+ backend tests added
- [ ] All existing 743 tests still pass
- [ ] Coverage ≥97% maintained

### Frontend
- [ ] next-intl installed and configured
- [ ] Translation files created (en.json, it.json)
- [ ] TypeScript autocomplete working
- [ ] App Router restructured to `[locale]` pattern
- [ ] LocaleSwitcher component created
- [ ] All components translated (auth, navigation, settings)
- [ ] All existing 56 E2E tests still pass
- [ ] 12+ new E2E locale tests added
- [ ] 8+ new unit tests added

### SEO
- [ ] Metadata implemented per locale
- [ ] Sitemap generated with hreflang
- [ ] robots.txt configured
- [ ] Lighthouse SEO = 100 (both EN and IT)

### Performance
- [ ] Core Web Vitals measured (both locales)
- [ ] LCP < 2.5s
- [ ] INP < 200ms
- [ ] CLS < 0.1
- [ ] Bundle analysis shows minimal impact

### Documentation
- [ ] This implementation plan complete
- [ ] `/docs/I18N.md` created (user guide)
- [ ] `/docs/I18N_MIGRATION_GUIDE.md` created
- [ ] `CLAUDE.md` updated with i18n patterns
- [ ] README.md updated with i18n feature
- [ ] CHANGELOG.md updated

### Testing
- [ ] Translation validation in CI
- [ ] All tests passing
- [ ] No flaky tests
- [ ] Coverage targets met

---

## 🔄 NEXT STEPS

After completing this implementation:

1. **Deploy to Staging**: Test in production-like environment
2. **Gather Feedback**: From team and early users
3. **Optimize Further**: Based on real-world usage data
4. **Add Languages**: If needed, follow the Italian example

---

## 📝 CHANGE LOG

| Date | Author | Change |
|------|--------|--------|
| 2025-11-17 | Claude | Initial plan created based on 2025 research |
| 2025-11-17 | Claude | Updated to 2 languages (EN, IT) per user request |

---

**End of Implementation Plan**

This plan represents state-of-the-art i18n implementation for 2025. It balances best practices, performance, SEO, and developer experience while remaining simple enough for a template showcase.

For questions or clarifications, refer to the detailed task descriptions in each phase.
