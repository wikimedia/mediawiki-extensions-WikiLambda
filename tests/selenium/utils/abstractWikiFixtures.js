/*!
 * Abstract Wiki test fixtures for WikiLambda browser test suite
 *
 * Creates and deletes Abstract Article pages via MediaWiki API, executed in the browser
 * so it reuses the logged-in session established by LoginPage.loginAdmin().
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

/**
 * Ensure a page exists with the given text content.
 *
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} payload.text
 * @param {string} [payload.summary]
 * @return {Promise<void>}
 */
export async function ensurePageExists( { title, text, summary = 'e2e setup' } ) {
	// Ensure we're on a normal MW page where mw.Api is available
	await browser.url( '/wiki/Main_Page' );

	const result = await browser.execute( async ( pageTitle, pageText, editSummary ) => {
		const api = new mw.Api();
		try {
			await api.postWithToken( 'csrf', {
				action: 'edit',
				title: pageTitle,
				text: pageText,
				summary: editSummary,
				contentmodel: 'abstractwiki',
				contentformat: 'text/plain',
				format: 'json'
			} );
			return { ok: true };
		} catch ( e ) {
			return { ok: false, error: String( e ) };
		}
	}, title, text, summary );

	if ( !result || result.ok !== true ) {
		throw new Error( `Failed to create page "${ title }": ${ result && result.error ? result.error : 'unknown error' }` );
	}
}
/**
 * Best-effort delete of a page (does not throw if delete fails).
 *
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} [payload.reason]
 * @return {Promise<void>}
 */
export async function deletePage( { title, reason = 'e2e cleanup' } ) {
	await browser.url( '/wiki/Main_Page' );

	await browser.execute( async ( pageTitle, deleteReason ) => {
		const api = new mw.Api();
		try {
			await api.postWithToken( 'csrf', {
				action: 'delete',
				title: pageTitle,
				reason: deleteReason,
				format: 'json'
			} );
			return { ok: true };
		} catch ( e ) {
			return { ok: false, error: String( e ) };
		}
	}, title, reason );
}
