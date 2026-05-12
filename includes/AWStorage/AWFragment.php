<?php
/**
 * WikiLambda Abstract Wikipedia Fragment Store: AWFragment Object
 *
 * Stores the payload of a rendered fragment and its status
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AWStorage;

class AWFragment {

	/** The fragment is not rendered */
	public const AVAILABILITY_MISSING = 0;
	/** The fragment is fresh: available for the given date */
	public const AVAILABILITY_FRESH = 1;
	/** The fragment is stale: only available for an earlier date */
	public const AVAILABILITY_STALE = 2;

	private ?array $payload = null;

	private int $availability = self::AVAILABILITY_MISSING;

	public function __construct(
		private readonly string $key,
		private readonly string $topicQid,
		private readonly string $locale,
		private readonly string $date,
		private readonly int $schemaVersion = AWArticleStore::AW_STORAGE_SCHEMA_VERSION,
	) {
	}

	/**
	 * Returns the payload of the stored AWFragment.
	 *
	 * If the fragment is missing, it will return an empty array.
	 * If the fragment exists, the payload contains an array with the keys 'success'
	 * and 'value'. The 'success' key indicates whether the fragment was rendered
	 * successfully, and the 'value' key contains the successful render in its
	 * final state (rendered and sanitized), or the error payload if it failed.
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
	 * @return array
	 */
	public function getValue(): array {
		return $this->payload ?? [];
	}

	/**
	 * Sets the rendered fragment value and its availability flag (fresh or stale)
	 *
	 * @param array $payload
	 * @param int $availability
	 */
	public function setValue( array $payload, int $availability ): void {
		$this->payload = $payload;
		$this->availability = $availability;
	}

	/**
	 * Returns whether the AWFragment value is success or failure.
	 *
	 * @return bool
	 */
	public function isOk(): bool {
		return !$this->isMissing() && ( $this->payload['success'] ?? false );
	}

	/**
	 * Returns whether the AWFragment value is missing or pending.
	 *
	 * @return bool
	 */
	public function isMissing(): bool {
		return $this->availability === self::AVAILABILITY_MISSING;
	}

	/**
	 * Returns whether the AWFragment value is fresh for the current date.
	 *
	 * @return bool
	 */
	public function isFresh(): bool {
		return $this->availability === self::AVAILABILITY_FRESH;
	}

	/**
	 * Returns whether the AWFragment value is available but stale.
	 *
	 * @return bool
	 */
	public function isStale(): bool {
		return $this->availability === self::AVAILABILITY_STALE;
	}

	/**
	 * Returns the fragment Key string.
	 * Key is built with AbstractContentUtils::makeCacheKeyForAbstractFragment
	 * and passed around for traceability.
	 *
	 * @return string
	 */
	public function getKey(): string {
		return $this->key;
	}
}
