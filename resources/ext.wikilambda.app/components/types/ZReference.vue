<!--
	WikiLambda Vue component for Z9/Reference objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-reference" data-testid="z-reference">
		<template v-if="!edit">
			<a
				v-if="valueLabel"
				class="ext-wikilambda-app-link"
				data-testid="edit-link"
				:lang="valueLabel.langCode"
				:dir="valueLabel.langDir"
				:href="valueUrl"
			>{{ valueLabel.label }}</a>
		</template>
		<template v-else>
			<wl-wikidata-reference-selector
				v-if="isWikidataEnum"
				:disabled="disabled"
				:selected-zid="value"
				data-testid="z-reference-wikidata-reference-selector"
				@select-item="setValue"
			></wl-wikidata-reference-selector>
			<wl-z-object-selector
				v-else
				:key-path="keyPath"
				:disabled="disabled"
				:selected-zid="value"
				:type="type"
				:return-type="returnType"
				:exclude-zids="excludeZids"
				data-testid="z-reference-selector"
				@select-item="setValue"
			></wl-z-object-selector>
		</template>
	</div>
</template>

<script>
const { defineComponent, computed } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useType = require( '../../composables/useType.js' );
const useZObject = require( '../../composables/useZObject.js' );
const useMainStore = require( '../../store/index.js' );
const urlUtils = require( '../../utils/urlUtils.js' );

// Base components
const ZObjectSelector = require( './../base/ZObjectSelector.vue' );
const WikidataReferenceSelector = require( './wikidata/ReferenceSelector.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-z-reference',
	components: {
		'wl-z-object-selector': ZObjectSelector,
		'wl-wikidata-reference-selector': WikidataReferenceSelector
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: [ Object, String ],
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		expectedType: {
			type: [ String, Object ],
			required: true
		},
		parentExpectedType: {
			type: [ String, Object ],
			required: false,
			default: Constants.Z_OBJECT
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	setup( props, { emit } ) {
		const { typeToString, isKeyTypedListItem } = useType();
		const { getZReferenceTerminalValue, key, parentKey } = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		// Computed properties
		/**
		 * Returns the value of the selected reference.
		 *
		 * @return {string}
		 */
		const value = computed( () => getZReferenceTerminalValue( props.objectValue ) );

		/**
		 * Returns the string value of the label for the selected reference.
		 * If no label is found, returns undefined.
		 *
		 * @return {LabelData|undefined}
		 */
		const valueLabel = computed( () => value.value ? store.getLabelData( value.value ) : undefined );

		/**
		 * Returns the link to the page of the selected reference.
		 *
		 * @return {string}
		 */
		const valueUrl = computed( () => urlUtils.generateViewUrl( {
			langCode: store.getUserLangCode,
			zid: value.value
		} ) );

		/**
		 * Returns the bound type to configure the ZObjectSelector:
		 * * if expectedType is bound: return expectedType, converted to a string
		 *   with no arguments if it's a generic type (e.g. Z881 instead of Z881(Z6)).
		 * * if expected type is unbound (Z1, or a resolver type like Z7, Z9 or Z18):
		 *   return undefined
		 *
		 * @return {string|undefined}
		 */
		const type = computed( () => {
			const unboundTypes = [ Constants.Z_OBJECT, ...Constants.RESOLVER_TYPES ];
			return !unboundTypes.includes( props.expectedType ) ?
				typeToString( props.expectedType, true ) :
				undefined;
		} );

		/**
		 * Returns the bound return type to configure the ZObjectSelector:
		 * * If key is Z7K1/Z_FUNCTION_CALL_FUNCTION, and function call return type is bound:
		 *   return parentExpectedType, converted to a string.
		 * * If key is Z7K1 but function call can return anything: return undefined
		 * * If key is not Z7K1: return undefined
		 *
		 * @return {string|undefined}
		 */
		const returnType = computed( () => {
			const unboundTypes = [ Constants.Z_OBJECT, ...Constants.RESOLVER_TYPES ];
			return ( key.value === Constants.Z_FUNCTION_CALL_FUNCTION &&
				!unboundTypes.includes( props.parentExpectedType ) ) ?
				typeToString( props.parentExpectedType, true ) :
				undefined;
		} );

		/**
		 * Returns the list of Zids to exclude from the ZObjectSelector lookup,
		 * depending on the current key and parent key.
		 * - For Z2K2 content type, excludes keys from EXCLUDE_FROM_PERSISTENT_CONTENT.
		 * - Excludes Wikidata enums unless selected as the direct parent of a ZObject/Z1
		 * and is the the key of a function call function (Z7K1).
		 * - For other cases, allows all.
		 *
		 * @return {Array}
		 */
		const excludeZids = computed( () => {
			// If current reference is within a multilingual string list/Z12, exclude
			// the languages already present in that list from the lookup.
			// However, allow the currently selected language to remain visible.
			if (
				isKeyTypedListItem( parentKey.value ) &&
				props.parentExpectedType === Constants.Z_MONOLINGUALSTRING &&
				store.isInMultilingualStringList( props.keyPath )
			) {
				const languagesInList = store.getLanguagesInParentMultilingualList( props.keyPath );
				return languagesInList.filter( ( langZid ) => langZid !== value.value );
			}
			if ( key.value === Constants.Z_OBJECT_TYPE &&
				parentKey.value === Constants.Z_PERSISTENTOBJECT_VALUE ) {
				return Constants.EXCLUDE_FROM_PERSISTENT_CONTENT;
			}
			if (
				key.value === Constants.Z_FUNCTION_CALL_FUNCTION &&
				parentKey.value === Constants.Z_PERSISTENTOBJECT_VALUE
			) {
				return [];
			}
			return [ Constants.Z_WIKIDATA_ENUM ];
		} );

		/**
		 * Returns true if the key is a Wikidata enum type.
		 *
		 * @return {boolean}
		 */
		const isWikidataEnum = computed( () => key.value === Constants.Z_WIKIDATA_ENUM_TYPE );

		/**
		 * Emits the event setValue so that ZObjectKey can update
		 * the terminal value in the ZObject data table. ZObjectSelector
		 * input event will always be called with a valid value from the
		 * lookup list, never with an empty value.
		 *
		 * @param {string} newValue
		 */
		function setValue( newValue ) {
			const keyPath = key.value !== Constants.Z_REFERENCE_ID ? [ Constants.Z_REFERENCE_ID ] : [];
			emit( 'set-value', { keyPath, value: newValue } );
		}

		return {
			excludeZids,
			isWikidataEnum,
			returnType,
			setValue,
			type,
			value,
			valueLabel,
			valueUrl
		};
	}
} );

</script>
