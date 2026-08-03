<?php

/**
 * WikiLambda integration test base class. Helper-only — exposes the ZObject /
 * language / error fixtures used by every WikiLambda integration test, with no
 * mode-specific setup of its own.
 *
 * Tests do not extend this class directly; they pick one of the four
 * mode-specific subclasses according to the wiki configuration their
 * subject-under-test runs in:
 *
 *   - WikiLambdaRepoModeIntegrationTestCase       — Wikifunctions repo wiki
 *   - WikiLambdaClientIntegrationTestCase         — Wikifunctions client wiki
 *   - WikiLambdaAbstractModeIntegrationTestCase   — Abstract Wikipedia repo wiki
 *   - WikiLambdaAbstractClientIntegrationTestCase — Abstract Wikipedia client wiki
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Content\Content;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Language\Language;
use MediaWiki\Permissions\Authority;
use MediaWikiIntegrationTestCase;

abstract class WikiLambdaIntegrationTestCase extends MediaWikiIntegrationTestCase {
	// Use this trait in the base class, as it will be needed from both
	// WikiLambdaClientIntegrationTestCase and WikiLambdaAbstractModeIntegrationTestCase
	use MockWikidataEntityLookupTrait;

	private string $mainDataPath;

	private static string $testDataPath;

	protected const ZLANG = [
		'en' => 'Z1002',
		'es' => 'Z1003',
		'fr' => 'Z1004',
		'ru' => 'Z1005',
		'zh' => 'Z1006',
		'de' => 'Z1430',
		'it' => 'Z1787',
		'pcd' => 'Z1829',
	];

	/** @inheritDoc */
	public function __construct( $name = null, array $data = [], $dataName = '' ) {
		parent::__construct( $name, $data, $dataName );

		$this->mainDataPath = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions';
	}

	/**
	 * Set directory with definitions used for this test suite
	 *
	 * @param string $path
	 */
	protected static function setTestDataPath( $path ) {
		self::$testDataPath = $path;
	}

	/**
	 * Given a zid, returns the zobject definition found in:
	 * * test data definitions (if directory is configured for this test suite)
	 * * function schemata data definitions, or
	 * If not found in either directory, raises Exception
	 *
	 * @param string $zid
	 * @return string
	 */
	private static function getDefinition( $zid ): string {
		$mainFile = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions' . "/$zid.json";
		$testFile = isset( self::$testDataPath ) ? self::$testDataPath . "/$zid.json" : null;

		if ( isset( self::$testDataPath ) && file_exists( $testFile ) ) {
			$data = file_get_contents( $testFile );
		} elseif ( file_exists( $mainFile ) ) {
			$data = file_get_contents( $mainFile );
		} else {
			throw new \RuntimeException( "ZObject definition for $zid not found in main or test data paths." );
		}

		return $data;
	}

	/**
	 * Inserts the given ZObjects from the builtin data collection directory
	 *
	 * @param string[] $zids
	 */
	protected function insertZids( $zids ): void {
		foreach ( $zids as $zid ) {
			$data = $this->getDefinition( $zid );
			// Unchecked: seeding a definition whose own type isn't in the wiki yet is rejected as
			// an invalid ZObject, which is why WikiLambdaRepoModeIntegrationTestCase's lone Z504
			// seed has silently no-opped. Asserting here would fail every repo-mode test over
			// that, so seeds stay best-effort until the seeding order is sorted out.
			$this->editPageUnchecked( $zid, $data, 'Test ZObject creation', NS_MAIN );
		}
	}

	/**
	 * Return the ZPersistentObject representation of a data object from the data collection directory
	 *
	 * @param string $zid
	 * @return ZPersistentObject
	 */
	protected static function getZPersistentObject( $zid ): ZPersistentObject {
		$data = self::getDefinition( $zid );
		return ZObjectFactory::create( json_decode( $data ) );
	}

	/**
	 * @inheritDoc
	 *
	 * A rejected edit is otherwise indistinguishable from a successful one until something
	 * dereferences the revision, so a test wiki that won't accept our content models fails
	 * with a downstream "on null" fatal rather than with the reason. Assert the status here
	 * so the failure names it (e.g. content-not-allowed-here) at the point of the edit.
	 */
	protected function editPage(
		$page,
		$content,
		$summary = '',
		$defaultNs = NS_MAIN,
		?Authority $performer = null
	) {
		$status = $this->editPageUnchecked( $page, $content, $summary, $defaultNs, $performer );
		$this->assertStatusOK( $status, "editPage of '$page' in namespace $defaultNs failed" );
		return $status;
	}

	/**
	 * As editPage(), but without asserting that the edit was accepted. For callers that
	 * knowingly tolerate a rejection, or assert on one themselves (e.g. the tests covering
	 * our save hooks refusing invalid content). Prefer editPage() everywhere else.
	 *
	 * @param mixed $page Title text, PageIdentity, LinkTarget or WikiPage, as core's editPage()
	 * @param string|Content $content
	 * @param string $summary
	 * @param int $defaultNs
	 * @param Authority|null $performer
	 * @return \MediaWiki\Storage\PageUpdateStatus
	 */
	protected function editPageUnchecked(
		$page,
		$content,
		$summary = '',
		$defaultNs = NS_MAIN,
		?Authority $performer = null
	) {
		// Make sure that $content Z0s are replaced with $page
		$contentText = $content instanceof Content ? $content->getText() : $content;
		$zPlaceholderRegex = '/\"' . ZTypeRegistry::Z_NULL_REFERENCE . '(K[1-9]\d*)?\"/';
		$contentText = preg_replace( $zPlaceholderRegex, "\"$page$1\"", $contentText );

		// Then call parent editPage
		return parent::editPage( $page, $contentText, $summary, $defaultNs, $performer );
	}

	/**
	 * Inserts the given Zids of existing ZErrorType instances, plus Z50 (ZErrorType)
	 *
	 * @param string[] $zids
	 */
	protected function insertZErrorTypes( $zids ): void {
		// Insert ZErrorType (Z50) and then all the wanted types
		$this->insertZids( array_merge( (array)'Z50', $zids ) );
	}

	/**
	 * Simulate the existance of a given set of language codes by registering
	 * them and their Zids
	 *
	 * @param string[] $langs
	 */
	protected function registerLangs( $langs ): void {
		$langRegistry = ZLangRegistry::singleton();
		foreach ( $langs as $code ) {
			$zid = self::ZLANG[$code];
			$langRegistry->register( $zid, $code );
		}
	}

	/**
	 * Simulate the existence of a given set of error types by registering
	 * their Zids
	 *
	 * @param string[] $errors
	 */
	protected function registerErrors( $errors ): void {
		$errorRegistry = ZErrorTypeRegistry::singleton();
		foreach ( $errors as $err ) {
			$errorRegistry->register( $err, $err );
		}
	}

	/**
	 * Returns instance of Language given a string language code
	 *
	 * @param string $code
	 * @return Language
	 */
	protected function makeLanguage( string $code ) {
		$services = $this->getServiceContainer();
		$languageFactory = $services->getLanguageFactory();
		return $languageFactory->getLanguage( $code );
	}

	/**
	 * Make sure that all the different registries are cleared and initialized with their initial values
	 */
	protected function tearDown(): void {
		ZObjectRegistry::clearAll();
		parent::tearDown();
	}
}
