<?php
/**
 * WikiLambda Abstract Wikipedia - Abstract service class to  AW Fragment storage.
 *
 * This store provides access to stored AW Article Fragmets, whether they
 * are stored in durable or ephemeral storage layer(s).
 *
 * The store provides the necessary getters to retrieve rendered AW Fragments.
 *
 * AWFragments are fetched:
 * * When composing an AW Article Section to store it in the durable AWArticleStore,
 *   which happens when running the updateAbstractWiiArticleStore maintenance script.
 * * When accessing the abstract.wikipedia.org view or edit page for a given topic
 *   and generating the AW Article preview for a given language.
 *
 * The AWFragment returned by the getter can be either fresh or stale, which
 * might determine the actions taken by the caller.
 *
 * NOTE:
 * This class isolates and decouples the AW Fragment storage layer. Currently, rendered
 * fragments are stored in an ephemeral cache (Memcached), but possibly in the future
 * we'd want to change this by adding other layers of fallback storage.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AWStorage;

use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguage;
use MediaWiki\Html\Html;

abstract class AWFragmentStore {

	public const ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX = 'WikiLambdaAbstractFragment';

	/**
	 * Returns the AWFragment rendered given:
	 * * the fragment composition, as stored in its AW Content object,
	 * * its topic Qid: the Wikidata Qid uniquely identifying the Abstract Wiki article,
	 * * the language to render it in: a WikifunctionsLanguage object containing the Language
	 *   and its Wikifunctions equivalent Zid, and
	 * * today's date: as a string in 'Y-m-d' date format.
	 *
	 * This getter ensures that:
	 * * An AWFragment object is always returned.
	 * * An AWFragment object can always be serialized as Html.
	 * * An AWFragment object might represent a missing (or non-ready, or pending) fragment.
	 * * A rendered (non-missing) AWFragment might contain a fresh or a stale value.
	 * * A rendered (non-missing) AWFragment might contain a successful or a failed render.
	 *
	 * As a side-effect, when a fresh rendered value is not available, this getter will
	 * queue an asynchronous re-rendering job to make sure that it eventually becomes updated.
	 *
	 * When a non-missing AWFragment is returned, the payload will contain an array with
	 * 'success' and 'value' keys that indicate the fragment render status:
	 *
	 * When the fragment was successfully built, 'value' contains a string with the final
	 * (rendered and sanitized) HTML:
	 *
	 * E.g.: [
	 *   'success' => true,
	 *   'value' => '<b>sanitized html</b>'
	 * ]
	 *
	 * When the fragment returned an error, 'value' contains structured error data
	 * which can be deserialized into a WikifunctioCallException with fromArray()
	 *
	 * E.g.: [
	 *   'success' => false,
	 *   'value' => [
	 *     'msg' => 'some-error-msg-code',
	 *     'httpStatusCode' => 500,
	 *     'zerror' => [],
	 *     'params' => []
	 *   ]
	 * ]
	 *
	 * @param array $fragment
	 * @param string $topicQid
	 * @param WikifunctionsLanguage $language
	 * @param string $date
	 * @param bool $revalidate
	 * @return AWFragment
	 */
	abstract public function getRenderedAWFragment(
		array $fragment,
		string $topicQid,
		WikifunctionsLanguage $language,
		string $date,
		bool $revalidate = true
	): AWFragment;

	/**
	 * Stores a given AWFragment data in the AWFragmentStore.
	 *
	 * Currently the AWFragmentStore consists on a MemcachedWrapper layer,
	 * and every AWFragment is stored under two keys:
	 * * fresh key, which contains qid, language, date and fragmentKey
	 * * stale key, with contains qid, language and fragmentKey
	 *
	 * @param string $topicQid
	 * @param string $languageZid
	 * @param string $date
	 * @param string $fragmentKey
	 * @param array $value
	 * @return bool
	 */
	abstract public function setRenderedAWFragment(
		string $topicQid,
		string $languageZid,
		string $date,
		string $fragmentKey,
		array $value
	): bool;

	/**
	 * Creates a chip-like html element for a fragment that returned an error, which will
	 * be rendered inside an integrated AW Article, for end-readers to consume as a normal
	 * Wikipedia article.
	 *
	 * @param string $locale
	 * @return string
	 */
	public static function createFailingFragmentBlock( string $locale ): string {
		return Html::rawElement( 'span', [ 'class' => 'ext-wikilambda-aw-fragment-failing' ],
			wfMessage( 'wikilambda-abstract-fragment-failing' )->inLanguage( $locale )->escaped()
		);
	}

	/**
	 * Creates a chip-like html element for a fragment that has not been rendered yet, which
	 * will be rendered inside an integrated AW Article, for end-readers to consume as a
	 * normal Wikipedia article.
	 *
	 * @param string $locale
	 * @return string
	 */
	public static function createPendingFragmentBlock( $locale ): string {
		return Html::rawElement( 'span', [ 'class' => 'ext-wikilambda-aw-fragment-pending' ],
			wfMessage( 'wikilambda-abstract-fragment-pending' )->inLanguage( $locale )->escaped()
		);
	}
}
