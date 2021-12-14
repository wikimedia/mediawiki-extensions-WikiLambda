<?php
/**
 * WikiLambda extension hooks
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use ApiMain;
use ApiMessage;
use CommentStoreComment;
use DatabaseUpdater;
use DerivativeContext;
use FauxRequest;
use Html;
use HtmlArmor;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZList;
use MediaWiki\Linker\LinkRenderer;
use MediaWiki\Linker\LinkTarget;
use MediaWiki\Revision\SlotRecord;
use MessageSpecifier;
use Parser;
use PPFrame;
use RequestContext;
use RuntimeException;
use Sanitizer;
use Status;
use Title;
use User;
use WikiPage;

class Hooks implements
	\MediaWiki\Hook\BeforePageDisplayHook,
	\MediaWiki\Hook\NamespaceIsMovableHook,
	\MediaWiki\Storage\Hook\MultiContentSaveHook,
	\MediaWiki\Permissions\Hook\GetUserPermissionsErrorsHook,
	\MediaWiki\Installer\Hook\LoadExtensionSchemaUpdatesHook,
	\MediaWiki\Hook\ParserFirstCallInitHook,
	\MediaWiki\Linker\Hook\HtmlPageLinkRendererEndHook
	{

	public static function registerExtension() {
		require_once __DIR__ . '/defines.php';

		global $wgNamespaceContentModels;
		$wgNamespaceContentModels[ NS_MAIN ] = CONTENT_MODEL_ZOBJECT;

		// (T267232) Prevent ZObject pages from being transcluded; sadly this isn't available as
		// an extension.json attribute as of yet.
		global $wgNonincludableNamespaces;
		$wgNonincludableNamespaces[] = NS_MAIN;
	}

	/**
	 * Declare ZObjects as JSON-dervied, so that (for now) they can be
	 * edited directing using the CodeEditor extension.
	 *
	 * @param Title $title
	 * @param string &$lang
	 * @return bool
	 */
	public static function onCodeEditorGetPageLanguage( Title $title, &$lang ) {
		if (
			$title->hasContentModel( CONTENT_MODEL_ZOBJECT )
			|| $title->inNamespace( NS_MAIN )
		) {
			$lang = 'json';
			return false;
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/BeforePageDisplay
	 *
	 * @param \OutputPage $out
	 * @param \Skin $skin
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		$config = $out->getConfig();
		if ( $config->get( 'WikiLambdaEnable' ) ) {
			// Do something.
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/MultiContentSave
	 *
	 * @param \MediaWiki\Revision\RenderedRevision $renderedRevision
	 * @param \MediaWiki\User\UserIdentity $user
	 * @param CommentStoreComment $summary
	 * @param int $flags
	 * @param Status $hookStatus
	 * @return bool|void
	 */
	public function onMultiContentSave( $renderedRevision, $user, $summary, $flags, $hookStatus ) {
		$title = $renderedRevision->getRevision()->getPageAsLinkTarget();
		if ( !$title->inNamespace( NS_MAIN ) ) {
			return true;
		}

		$zid = $title->getDBkey();
		if ( !ZObjectUtils::isValidZObjectReference( $zid ) ) {
			$hookStatus->fatal( 'wikilambda-invalidzobjecttitle', $zid );
			return false;
		}

		$content = $renderedRevision->getRevision()->getSlots()->getContent( SlotRecord::MAIN );

		if ( !( $content instanceof ZObjectContent ) ) {
			$hookStatus->fatal( 'wikilambda-invalidcontenttype' );
			return false;
		}

		if ( !$content->isValid() ) {
			$hookStatus->fatal( 'wikilambda-invalidzobject' );
			return false;
		}

		// (T260751) Ensure uniqueness of type / label / language triples on save.
		$newLabels = $content->getLabels()->getValueAsList();

		if ( $newLabels === [] ) {
			// Unlabelled; don't error.
			return true;
		}

		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$clashes = $zObjectStore->findZObjectLabelConflicts(
			$zid,
			$content->getZType(),
			$newLabels
		);

		if ( $clashes === [] ) {
			return true;
		}

		foreach ( $clashes as $language => $clash_zid ) {
			$hookStatus->fatal( 'wikilambda-labelclash', $clash_zid, $language );
		}

		return false;
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/getUserPermissionsErrors
	 *
	 * @param Title $title
	 * @param User $user
	 * @param string $action
	 * @param array|string|MessageSpecifier &$result
	 * @return bool|void
	 */
	public function onGetUserPermissionsErrors( $title, $user, $action, &$result ) {
		if ( !$title->inNamespace( NS_MAIN ) ) {
			return;
		}

		// TODO: Is there a nicer way of getting 'all change actions'?
		if ( !( $action == 'create' || $action == 'edit' || $action == 'upload' ) ) {
			return;
		}

		$zid = $title->getDBkey();
		if ( !ZObjectUtils::isValidZObjectReference( $zid ) ) {
			$result = ApiMessage::create(
				wfMessage( 'wikilambda-invalidzobjecttitle', $zid ),
				'wikilambda-invalidzobjecttitle'
			);
			return false;
		}

		// TODO: Per-user rights checks (in getUserPermissionsErrorsExpensive instead)?

		return true;
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/LoadExtensionSchemaUpdates
	 *
	 * @param DatabaseUpdater $updater DatabaseUpdater subclass
	 */
	public function onLoadExtensionSchemaUpdates( $updater ) {
		$db = $updater->getDB();
		$type = $db->getType();

		if ( !in_array( $type, [ 'mysql', 'sqlite', 'postgres' ] ) ) {
			wfWarn( "Database type '$type' is not supported by the WikiLambda extension." );
			return;
		}

		$tables = [
			'zobject_labels',
			'zobject_label_conflicts',
			'zobject_function_join',
		];

		foreach ( $tables as $key => $table ) {
			$updater->addExtensionTable( 'wikilambda_' . $table, __DIR__ . "/sql/table-$table-generated-$type.sql" );
		}

		// Database updates:
		// (T285368) Add primary label field to labels table
		$updater->addExtensionField(
			'wikilambda_zobject_labels',
			'wlzl_label_primary',
			__DIR__ . "/sql/abstractSchemaChanges/patch-add-primary-label-field-generated-$type.sql"
		);

		// (T262089) Add return type field to labels table
		$updater->addExtensionField(
			'wikilambda_zobject_labels',
			'wlzl_return_type',
			__DIR__ . "/sql/abstractSchemaChanges/patch-add-return-type-field-generated-$type.sql"
		);

		$updater->addExtensionUpdate( [ [ __CLASS__, 'createInitialContent' ] ] );
	}

	/**
	 * Installer/Updater callback to create the initial "system" ZObjects on any installation. This
	 * is a callback so that it runs after the tables have been created/updated.
	 *
	 * @param DatabaseUpdater $updater
	 */
	public static function createInitialContent( DatabaseUpdater $updater ) {
		// Ensure that the extension is set up (namespace is defined) even when running in update.php outside of MW.
		self::registerExtension();

		// Note: Hard-coding the English version for messages as this can run without a Context and so no language set.
		$creatingUserName = wfMessage( 'wikilambda-systemuser' )->inLanguage( 'en' )->text();
		$creatingUser = User::newSystemUser( $creatingUserName, [ 'steal' => true ] );

		$creatingComment = wfMessage( 'wikilambda-bootstrapcreationeditsummary' )->inLanguage( 'en' )->text();

		if ( !$creatingUser ) {
			// Something went wrong, give up.
			return;
		}

		$initialDataToLoadPath = dirname( __DIR__ ) . '/function-schemata/data/definitions/';

		$dependenciesFile = file_get_contents( $initialDataToLoadPath . 'dependencies.json' );
		if ( $dependenciesFile === false ) {
			throw new RuntimeException(
				'Could not load dependencies file from function-schemata sub-repository of the WikiLambda extension.'
					. ' Have you initiated & fetched it? Try `git submodule update --init --recursive`.'
			);
		}
		$dependencies = json_decode( $dependenciesFile, true );

		$initialDataToLoadListing = array_filter(
			scandir( $initialDataToLoadPath ),
			static function ( $key ) {
				return (bool)preg_match( '/^Z\d+\.json$/', $key );
			}
		);

		// Naturally sort, so Z2 gets created before Z10 etc.
		natsort( $initialDataToLoadListing );

		foreach ( $initialDataToLoadListing as $filename ) {
			self::insertContentObject( $updater, $filename, $dependencies, $creatingUser, $creatingComment );
		}
	}

	/**
	 * Inserts into the database the ZObject found in a given filename of the data directory. First checks
	 * whether the ZObject has any dependencies, according to the dependencies.json manifest file, and if so,
	 * inserts all the dependencies before trying the current ZObject.
	 *
	 * @param DatabaseUpdater $updater
	 * @param string $filename
	 * @param array $dependencies
	 * @param User $user
	 * @param string $comment
	 * @param string[] $track
	 * @return bool Has successfully inserted the content object
	 */
	private static function insertContentObject( $updater, $filename, $dependencies, $user, $comment, $track = [] ) {
		$initialDataToLoadPath = dirname( __DIR__ ) . '/function-schemata/data/definitions/';
		$updateRowName = "create WikiLambda initial content - $filename";

		$langReg = ZLangRegistry::singleton();
		$typeReg = ZTypeRegistry::singleton();

		// Check dependencies
		$zid = substr( $filename, 0, -5 );

		if ( array_key_exists( $zid,  $dependencies ) ) {
			$deps = $dependencies[ $zid ];
			foreach ( $deps as $dep ) {
				if (
					// Avoid circular dependencies
					!in_array( $dep, $track )
					&& !$langReg->isZidCached( $dep )
					&& !$typeReg->isZidCached( $dep )
				) {
					// Call recursively till all dependencies have been added
					$success = self::insertContentObject(
						$updater,
						"$dep.json",
						$dependencies,
						$user,
						$comment,
						array_merge( $track, (array)$dep )
					);
					// If any of the dependencies fail, we desist on the current insertion
					if ( !$success ) {
						return false;
					}
				}
			}
		}

		$zid = substr( $filename, 0, -5 );
		$title = Title::newFromText( $zid, NS_MAIN );
		$page = WikiPage::factory( $title );

		// Zid has already been inserted, so just purge the page to update secondary data and return true
		if ( $updater->updateRowExists( $updateRowName ) ) {
			$page->doPurge();
			return true;
		}

		$data = file_get_contents( $initialDataToLoadPath . $filename );
		if ( !$data ) {
			// something went wrong, give up.
			$updater->output( "\t❌ Unable to load file contents for {$title->getPrefixedText()}.\n" );
			return false;
		}

		try {
			$content = ZObjectContentHandler::makeContent( $data, $title );
		} catch ( ZErrorException $e ) {
			$updater->output( "\t❌ Unable to make a ZObject for {$title->getPrefixedText()}.\n" );
			return false;
		}

		$status = $page->doUserEditContent(
			/* content */ $content,
			/* user */ $user,
			/* edit summary */ $comment
		);

		if ( $status->isOK() ) {
			$updater->insertUpdateRow( $updateRowName );
			if ( !defined( 'MW_PHPUNIT_TEST' ) ) {
				// Don't log this during unit testing, quibble thinks it means we're broken.
				$updater->output( "\tSuccessfully created {$title->getPrefixedText()}.\n" );
			}
		} else {
			$firstError = $status->getErrors()[0];
			$error = wfMessage( $firstError[ 'message' ], $firstError[ 'params' ] );
			// @phan-suppress-next-line SecurityCheck-DoubleEscaped Error message is just logged, not rendered.
			$updater->output( "\t❌ Unable to make a page for {$title->getPrefixedText()}: $error\n" );
		}

		return $status->isOK();
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/NamespaceIsMovable
	 *
	 * @param int $index
	 * @param bool &$result
	 * @return bool|void
	 */
	public function onNamespaceIsMovable( $index, &$result ) {
		if ( $index === NS_MAIN ) {
			$result = false;
			// Over-ride any other extensions which might have other ideas
			return false;
		}

		return null;
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/HtmlPageLinkRendererEnd
	 *
	 * @param LinkRenderer $linkRenderer
	 * @param LinkTarget $linkTarget
	 * @param bool $isKnown
	 * @param string|HtmlArmor &$text
	 * @param string[] &$attribs
	 * @param string &$ret
	 * @return bool|void
	 */
	public function onHtmlPageLinkRendererEnd(
		$linkRenderer, $linkTarget, $isKnown, &$text, &$attribs, &$ret
	) {
		$context = RequestContext::getMain();
		$out = $context->getOutput();

		// Do nothing if any of these apply:
		if (
			// … there's no title in the main context
			!$context->hasTitle()
			// … there's no title set for the output page
			|| !$out->getTitle()
			// … the request is via the API (except for test runs)
			|| ( defined( 'MW_API' ) && MW_API !== 'TEST' )
			// … the target isn't known
			|| !$isKnown
		) {
			return;
		}

		// Convert the slimline LinkTarget into a full-fat Title so we can ask deeper questions
		$targetTitle = Title::newFromLinkTarget( $linkTarget );

		// Do nothing if any of these apply:
		if (
			// … the target isn't one of ours
			!$targetTitle->inNamespace( NS_MAIN ) || !$targetTitle->hasContentModel( CONTENT_MODEL_ZOBJECT )
			// … the label is already over-ridden (e.g. for "prev" and "cur" and revision links on history pages)
			|| ( $text !== null && $targetTitle->getFullText() !== HtmlArmor::getHtml( $text ) )
			) {
			return;
		}

		$zObjectStore = WikiLambdaServices::getZObjectStore();

		// Rather than (rather expensively) fetching the whole object from the ZObjectStore, see if the labels are in
		// the labels table already, which is very much faster:
		$zLangRegistry = ZLangRegistry::singleton();
		$label = $zObjectStore->fetchZObjectLabel(
			$targetTitle->getBaseText(),
			$context->getLanguage()->getCode(),
			true
		);

		// Just in case the database has no entry (e.g. the table is a millisecond behind or so), load the full object.
		if ( $label === null ) {
			$targetZObject = $zObjectStore->fetchZObjectByTitle( $targetTitle );
			// Do nothing if somehow after all that it's not loadable.
			if ( !$targetZObject || !( $targetZObject instanceof ZObjectContent ) || !$targetZObject->isValid() ) {
				return;
			}

			// At this point, we know they're linking to a ZObject page, so show a label, falling back
			// to English even if that's not in the language's fall-back chain.
			$label = $targetZObject->getLabels()->getStringForLanguageOrEnglish( $context->getLanguage() );
		}

		// Finally, set the label of the link to the escaped user-supplied label
		// TODO: Consider also showing the ZID?
		// @phan-suppress-next-line PhanTypeMismatchArgumentNullableInternal; if fetchZObjectLabel() is null we replace
		$text = htmlspecialchars( $label );
	}

	/**
	 * Register {{#function:…}} as a wikitext parser function to trigger function evaluation.
	 *
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/ParserFirstCallInit
	 *
	 * @param Parser $parser
	 */
	public function onParserFirstCallInit( $parser ) {
		$parser->setFunctionHook( 'function', [ __CLASS__ , 'parserFunctionCallback' ], Parser::SFH_OBJECT_ARGS );
	}

	/**
	 * Construct the JSON for a Z7/FunctionCall.
	 *
	 * TODO: This shouldn't really exist here.
	 *
	 * @param string $target The ZID of the target function
	 * @param string[] $arguments The arguments to pass to the call
	 * @return string
	 */
	private static function createFunctionCallJSON( $target, $arguments ): string {
		$callObject = [];

		$callObject['Z1K1'] = [ 'Z1K1' => 'Z9', 'Z9K1' => 'Z7' ];
		$callObject['Z7K1'] = [ 'Z1K1' => 'Z9', 'Z9K1' => $target ];

		for ( $i = 0; $i < count( $arguments ); $i++ ) {

			$key = $target . 'K' . ( $i + 1 );

			$callObject[$key] = [
				'Z1K1' => 'Z6',
				'Z6K1' => $arguments[ $i ],
			];
		}

		$returnString = json_encode( $callObject );

		return $returnString;
	}

	/**
	 * @param Parser $parser
	 * @param PPFrame $frame
	 * @param array $args
	 * @return array
	 */
	public static function parserFunctionCallback( Parser $parser, $frame, $args = [] ) {
		// TODO: Turn $args into the request more properly.

		$cleanupInput = static function ( $input ) use ( $frame ) {
			return trim( Sanitizer::decodeCharReferences( $frame->expand( $input ) ) );
		};

		$cleanedArgs = array_map( $cleanupInput, $args );

		$target = $cleanedArgs[0];

		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$targetTitle = Title::newFromText( $target, NS_MAIN );
		if ( !( $targetTitle->exists() ) ) {
			// User is trying to use a function that doesn't exist
			$ret = Html::errorBox(
				wfMessage(
					'wikilambda-functioncall-error-unknown',
					$target
				)->parseAsBlock()
			);
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-unknown-category' );
			return [ $ret ];
		}

		$targetObject = $zObjectStore->fetchZObjectByTitle( $targetTitle );

		if ( $targetObject->getZType() !== 'Z8' ) {
			// User is trying to use a ZObject that's not a ZFunction
			$ret = Html::errorBox(
				wfMessage(
					'wikilambda-functioncall-error-nonfunction',
					$target
				)->parseAsBlock()
			);
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-nonfunction-category' );
			return [ $ret ];
		}

		$targetFunction = $targetObject->getInnerZObject();

		if ( $targetFunction->getValueByKey( 'Z8K2' )->getZValue() !== 'Z6' ) {
			// User is trying to use a ZFunction that returns something other than a Z6/String
			$ret = Html::errorBox(
				wfMessage(
					'wikilambda-functioncall-error-nonstringoutput',
					$target
				)->parseAsBlock()
			);
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-nonstringoutput-category' );
			return [ $ret ];
		}

		$targetFunctionArguments = $targetFunction->getValueByKey( 'Z8K1' );
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZList $targetFunctionArguments';
		$nonStringArgumentsDefinition = array_filter(
			$targetFunctionArguments->getZListAsArray(),
			static function ( $arg_value ) {
				return !(
					is_object( $arg_value )
					&& $arg_value->getValueByKey( 'Z1K1' )->getZValue() === 'Z17'
					&& $arg_value->getValueByKey( 'Z17K1' )->getZValue() === 'Z6'
				);
			},
			ARRAY_FILTER_USE_BOTH
		);

		if ( count( $nonStringArgumentsDefinition ) ) {

			// TODO: Would be nice to deal with multiple
			$nonStringArgumentDefinition = $nonStringArgumentsDefinition[ 0 ];

			$nonStringArgumentType = $nonStringArgumentDefinition->getValueByKey( 'Z17K1' );
			$nonStringArgument = $nonStringArgumentDefinition->getValueByKey( 'Z17K2' );

			// User is trying to use a ZFunction that takes something other than a Z6/String
			$ret = Html::errorBox(
				wfMessage(
					'wikilambda-functioncall-error-nonstringinput',
					$target,
					$nonStringArgument,
					$nonStringArgumentType
				)->parseAsBlock()
			);
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-nonstringinput-category' );
			return [ $ret ];
		}

		$arguments = array_slice( $cleanedArgs, 1 );

		$call = self::createFunctionCallJSON( $target, $arguments );

		// TODO: We want a much finer control on execution time than this.
		// TODO: Actually do this, or something similar?
		// set_time_limit( 1 );
		try {
			// TODO: We should retain this object for re-use if there's more than one call per page.
			$api = new ApiMain( new FauxRequest() );
			$request = new FauxRequest(
				[
					'format' => 'json',
					'action' => 'wikilambda_function_call',
					'wikilambda_function_call_zobject' => $call,
				],
				/* wasPosted */ true
			);

			$context = new DerivativeContext( RequestContext::getMain() );
			$context->setRequest( $request );
			$api->setContext( $context );
			$api->execute();
			$outerResponse = $api->getResult()->getResultData( [], [ 'Strip' => 'all' ] );

			if ( isset( $outerResponse[ 'error' ] ) ) {
				$zerror = ZObjectFactory::create( $outerResponse[ 'error' ] );
				if ( !( $zerror instanceof ZError ) ) {
					$zerror = new ZError( 'Z507', new ZList( [ 'Server returned a non-ZError error!', $zerror ] ) );
				}
				throw new ZErrorException( $zerror );
			}

			// Shuck the result JSON string into an object
			$response = json_decode(
				$outerResponse['query']['wikilambda_function_call']['Orchestrated']['data'],
				true
			);

			if ( !$response || $response['Z1K1'] !== 'Z22' ) {
				// The server's not given us a result!
				$zerror = new ZError( 'Z507', new ZList( [ 'Server returned a non-result!' ] ) );
				throw new ZErrorException( $zerror );
			}
			if ( $response['Z22K1'] === 'Z23' ) {
				// If the server has responsed with a Z5, show that properly.
				$zerror = new ZError( 'Z507', new ZList( [ $response['Z22K2'] ] ) );
				throw new ZErrorException( $zerror );
			}
			$ret = $response['Z22K1'];
		} catch ( ZErrorException $e ) {
			$ret = Html::errorBox(
				wfMessage(
					'wikilambda-functioncall-error',
					$e->getZErrorMessage()
				)->parseAsBlock()
			);
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-category' );
		} catch ( \Throwable $th ) {
			// Something went wrong elsewhere; no nice translatable ZError to show, sadly.
			$ret = Html::errorBox(
				wfMessage(
					'wikilambda-functioncall-error',
					$th->getMessage()
				)->parseAsBlock()
			);
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-category' );
		} finally {
			// Restore time limits to status quo.
			// TODO: Actually do this, or something similar?
			// set_time_limit( 0 );
		}

		// TODO: Turn this JSON blob of a ZObject into a content fragment (string) somehow.
		return [
			trim( $ret ),
			/* Force content to be escaped */ 'nowiki'
		];
	}
}
