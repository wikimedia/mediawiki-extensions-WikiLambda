<?php
/**
 * WikiLambda ZObject User Authorization service
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Authorization;

use MediaWiki\Extension\WikiLambda\Diff\ZObjectDiffer;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;
use MediaWiki\Permissions\Authority;
use MediaWiki\Title\Title;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Yaml\Yaml;

class ZObjectAuthorization implements LoggerAwareInterface {

	private LoggerInterface $logger;

	/**
	 * @param LoggerInterface $logger
	 */
	public function __construct( LoggerInterface $logger ) {
		$this->logger = $logger;
	}

	/**
	 * Given a ZObject edit or creation, requests the necessary rights and checks
	 * whether the user has them all. Fails if any of the rights are not present
	 * in the user groups.
	 *
	 * @param ZObjectContent|null $oldContent
	 * @param ZObjectContent $newContent
	 * @param Authority $authority
	 * @param Title $title
	 * @return AuthorizationStatus
	 */
	public function authorize( $oldContent, $newContent, $authority, $title ): AuthorizationStatus {
		// If oldContent is null, we are creating a new object; else we editing
		$creating = ( $oldContent === null );

		// We get the list of required rights for the revision
		$requiredRights = $creating
			? $this->getRequiredCreateRights( $newContent, $title )
			: $this->getRequiredEditRights( $oldContent, $newContent, $title );

		// We check that the user has the necessary rights
		$status = new AuthorizationStatus();

		foreach ( $requiredRights as $right ) {
			// TODO (T375065): We can probably replace this with $authority->isAllowedAll( $requiredRights );
			if ( !$authority->isAllowed( $right ) ) {
				$flags = $creating ? EDIT_NEW : EDIT_UPDATE;
				$error = ZErrorFactory::createAuthorizationZError( $right, $flags );
				$status->setUnauthorized( $right, $error );
				break;
			}
		}
		return $status;
	}

	/**
	 * Given a new ZObject content object, uses its type and zid information to
	 * return the array of user rights that must be present in order to successfully
	 * authorize the creation.
	 *
	 * @param ZObjectContent $content
	 * @param Title $title
	 * @return string[]
	 */
	public function getRequiredCreateRights( $content, $title ): array {
		// Default rights necessary for create:
		$userRights = [ 'edit', 'wikilambda-create' ];

		// 1. Get type of the object
		$type = $content->getZType();

		// 2. Detect special right for builtin objects
		$zObjectId = $content->getZid();
		if ( substr( $zObjectId, 1 ) < 10000 ) {
			array_push( $userRights, 'wikilambda-create-predefined' );
		}

		// 3. Detect special rights per type
		switch ( $type ) {
			case ZTypeRegistry::Z_TYPE:
				array_push( $userRights, 'wikilambda-create-type' );
				break;

			case ZTypeRegistry::Z_FUNCTION:
				array_push( $userRights, 'wikilambda-create-function' );
				break;

			case ZTypeRegistry::Z_LANGUAGE:
				array_push( $userRights, 'wikilambda-create-language' );
				break;

			case ZTypeRegistry::Z_PROGRAMMINGLANGUAGE:
				array_push( $userRights, 'wikilambda-create-programming' );
				break;

			case ZTypeRegistry::Z_IMPLEMENTATION:
				array_push( $userRights, 'wikilambda-create-implementation' );
				break;

			case ZTypeRegistry::Z_TESTER:
				array_push( $userRights, 'wikilambda-create-tester' );
				break;

			case ZTypeRegistry::Z_BOOLEAN:
				array_push( $userRights, 'wikilambda-create-boolean' );
				break;

			case ZTypeRegistry::Z_UNIT:
				array_push( $userRights, 'wikilambda-create-unit' );
				break;

			case ZTypeRegistry::Z_DESERIALISER:
			case ZTypeRegistry::Z_SERIALISER:
				array_push( $userRights, 'wikilambda-create-converter' );
				break;

			default:
				// Check for enumeration
				$typeTitle = Title::newFromText( $type, NS_MAIN );
				$zObjectStore = WikiLambdaServices::getZObjectStore();
				$typeObject = $zObjectStore->fetchZObjectByTitle( $typeTitle );
				if ( $typeObject ) {
					$typeInnerObject = $typeObject->getInnerZObject();
					if ( ( $typeInnerObject instanceof ZType ) && $typeInnerObject->isEnumType() ) {
						array_push( $userRights, 'wikilambda-create-enum-value' );
					}
				}
		}

		return $userRights;
	}

	/**
	 * Given a ZObject edit, matches with the available authorization rules and
	 * returns the array of user rights that must be present in order to successfully
	 * authorize the edit.
	 *
	 * @param ZObjectContent $fromContent
	 * @param ZObjectContent $toContent
	 * @param Title $title
	 * @return string[]
	 */
	public function getRequiredEditRights( $fromContent, $toContent, $title ): array {
		// Default rights necessary for edit:
		$userRights = [ 'edit' ];
		// 1. Get type of object
		$type = $toContent->getZType();

		// 2. Initial filter of the rules by type
		$rules = $this->getRulesByType( $type );

		// 3. Calculate the diffs
		$diffs = $this->getDiffOps( $fromContent, $toContent );

		// 4. For each diff op we do:
		// 4.1. For every rule, we match the path pattern and operation
		// 4.2. If there's a match, we pass any filter we encounter in the rule
		// 4.3. If every condition passes, we gather the necessary rights and go to next diff
		foreach ( $diffs as $diff ) {
			foreach ( $rules as $rule ) {
				if ( $this->pathMatches( $diff, $rule ) && $this->opMatches( $diff, $rule ) ) {
					if ( $this->filterMatches( $diff, $rule, $fromContent, $toContent, $title ) ) {
						$theseRights = $this->getRightsByOp( $diff, $rule );
						$userRights = array_merge( $userRights, $theseRights );
						break;
					}
				}
			}
		}

		return array_values( array_unique( $userRights ) );
	}

	/**
	 * Whether the diff path matches the rule path pattern
	 *
	 * @param array $diff
	 * @param array $rule
	 * @return bool
	 */
	private function pathMatches( $diff, $rule ): bool {
		$path = implode( ".", $diff['path'] );
		$pattern = $rule['path'];
		return preg_match( "/$pattern/", $path );
	}

	/**
	 * Whether the diff operation matches any of the operations described in the
	 * rule, which can be the exact rule or the keyword "any".
	 *
	 * @param array $diff
	 * @param array $rule
	 * @return bool
	 */
	private function opMatches( $diff, $rule ): bool {
		$op = $diff['op']->getType();
		$ops = $rule['operations'];
		return array_key_exists( $op, $ops ) || array_key_exists( 'any', $ops );
	}

	/**
	 * Whether the objects being editted pass the filter specified in the rule.
	 * The filter must be the class name of an implementation of the interface
	 * ZObjectFilter.
	 *
	 * @param array $diff
	 * @param array $rule
	 * @param ZObjectContent $fromContent
	 * @param ZObjectContent $toContent
	 * @param Title $title
	 * @return bool
	 */
	private function filterMatches( $diff, $rule, $fromContent, $toContent, $title ): bool {
		$pass = true;
		if ( array_key_exists( 'filter', $rule ) ) {
			$filterArgs = $rule['filter'];
			$filterClass = array_shift( $filterArgs );
			$callableClass = 'MediaWiki\Extension\WikiLambda\Authorization\\' . $filterClass;
			try {
				$pass = $callableClass::pass( $fromContent, $toContent, $title, $filterArgs );
			} catch ( \Exception $e ) {
				$this->getLogger()->warning(
					'Filter is specified in the rules but method is not available; returning false',
					[
						'filterClass' => $filterClass,
						'title' => $title,
						'exception' => $e
					]
				);
				$pass = false;
			}
		}
		return $pass;
	}

	/**
	 * Given a diff with a particular operation and a matched rule, gather
	 * return the list of rights that correspond to that operation.
	 *
	 * @param array $diff
	 * @param array $rule
	 * @return array
	 */
	private function getRightsByOp( $diff, $rule ): array {
		$opType = $diff['op']->getType();
		$ops = $rule['operations'];
		$rights = [];
		if ( array_key_exists( 'any', $ops ) ) {
			$rights = array_merge( $rights, $ops['any'] );
		}
		if ( array_key_exists( $opType, $ops ) ) {
			$rights = array_merge( $rights, $ops[$opType] );
		}
		return $rights;
	}

	/**
	 * Call the ZObjectDiffer and return the collection of granular
	 * diffs found in an edit.
	 *
	 * @param ZObjectContent $fromContent
	 * @param ZObjectContent $toContent
	 * @return array
	 */
	private function getDiffOps( $fromContent, $toContent ): array {
		$differ = new ZObjectDiffer();
		$diffOps = $differ->doDiff(
			$this->toDiffArray( $fromContent ),
			$this->toDiffArray( $toContent )
		);
		return ZObjectDiffer::flattenDiff( $diffOps );
	}

	/**
	 * Helper function to transform the content object before passing
	 * it to the ZObjectDiffer service.
	 *
	 * @param ZObjectContent $content
	 * @return array
	 */
	private function toDiffArray( ZObjectContent $content ): array {
		return json_decode( json_encode( $content->getObject() ), true );
	}

	/**
	 * Returns the path of the authorization rules YAML file
	 *
	 * @return string
	 */
	private static function ruleFilePath(): string {
		return dirname( __DIR__, 2 ) . '/authorization-rules.yml';
	}

	/**
	 * Reads the authorization rules file and returns the list of
	 * rules filtered by type. This is an initial filter pass, so
	 * that the system doesn't try to match rules that are not
	 * applicable for this given type.
	 *
	 * @param string $type
	 * @return array
	 */
	private function getRulesByType( string $type ): array {
		$allRules = Yaml::parseFile( self::ruleFilePath() );
		$filteredRules = array_filter( $allRules, static function ( $rule ) use ( $type ) {
			return ( !array_key_exists( 'type', $rule ) || ( $rule[ 'type' ] === $type ) );
		} );
		return $filteredRules;
	}

	/**
	 * @inheritDoc
	 */
	public function setLogger( LoggerInterface $logger ) {
		$this->logger = $logger;
	}

	/**
	 * @inheritDoc
	 */
	public function getLogger() {
		return $this->logger;
	}
}
