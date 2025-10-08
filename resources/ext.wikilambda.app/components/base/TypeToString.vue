<!--
	WikiLambda Vue component widget for transforming a string or object
	representing a type into a string with links. This is currently used
	in the FunctionEvaluator. The functionality is similar to that from
	the component ZObjectToString. However, ZObjectToString represents an
	object that is present in the store transformed into a flat table
	representation. TypeToString repsents a JS object passed as property.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-type-to-string" data-testid="type-to-string">
		<a
			v-if="zid"
			:href="wikiUrl"
			:lang="labelData.langCode"
			:dir="labelData.langDir"
		>{{ labelData.labelOrUntitled }}</a>
		<div
			v-if="hasArgs"
			class="ext-wikilambda-app-type-to-string">
			&nbsp;(
			<!-- eslint-disable-next-line vue/no-v-for-template-key -->
			<template
				v-for="( argKey, index ) in args"
				:key="argKey"
			>
				<wl-type-to-string :type="type[ argKey ]"></wl-type-to-string>
				<span v-if="hasComma( index )">,&nbsp;</span>
			</template>
			)
		</div>
	</div>
</template>

<script>
const { defineComponent, computed, onMounted } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const urlUtils = require( '../../utils/urlUtils.js' );
const useMainStore = require( '../../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-type-to-string',
	props: {
		type: {
			type: [ String, Object ],
			required: true
		}
	},
	setup( props ) {
		const store = useMainStore();

		/**
		 * Whether the input type is a reference or a function call
		 *
		 * @return {string}
		 */
		const mode = computed( () => typeof props.type === 'string' ?
			Constants.Z_REFERENCE :
			props.type[ Constants.Z_OBJECT_TYPE ] );

		/**
		 * The first Zid to convert into link, either the reference
		 * terminal zid, or the ID of the function call if it's a
		 * generic type
		 *
		 * @return {string|undefined}
		 */
		const zid = computed( () => {
			switch ( mode.value ) {
				case Constants.Z_REFERENCE:
					return props.type;
				case Constants.Z_FUNCTION_CALL:
					return props.type[ Constants.Z_FUNCTION_CALL_FUNCTION ];
				default:
					return undefined;
			}
		} );

		/**
		 * Returns the wiki URL for the main zid
		 *
		 * @return {string}
		 */
		const wikiUrl = computed( () => urlUtils.generateViewUrl( {
			langCode: store.getUserLangCode,
			zid: zid.value
		} ) );

		/**
		 * Returns the label data of the main Zid
		 *
		 * @return {LabelData}
		 */
		const labelData = computed( () => store.getLabelData( zid.value ) );

		/**
		 * If the type is a generic type (and represented by a function
		 * call), returns the arguments, which are all the keys excluding
		 * Z1K1 and Z7K1
		 *
		 * @return {Array}
		 */
		const args = computed( () => {
			if ( mode.value === Constants.Z_FUNCTION_CALL ) {
				return Object.keys( props.type ).filter( ( key ) => (
					key !== Constants.Z_OBJECT_TYPE &&
					key !== Constants.Z_FUNCTION_CALL_FUNCTION
				) );
			}
			return [];
		} );

		/**
		 * Whether there are any args to list after the main zid
		 *
		 * @return {boolean}
		 */
		const hasArgs = computed( () => args.value.length > 0 );

		/**
		 * Whether a ZObject child needs a trailing comma given its index
		 *
		 * @param {number} index
		 * @return {boolean}
		 */
		const hasComma = ( index ) => ( ( index + 1 ) < args.value.length );

		onMounted( () => {
			if ( zid.value ) {
				store.fetchZids( { zids: [ zid.value ] } );
			}
		} );

		return {
			args,
			hasArgs,
			hasComma,
			labelData,
			wikiUrl,
			zid
		};
	}
} );
</script>

<style lang="less">
.ext-wikilambda-app-type-to-string {
	display: flex;
	flex-flow: row wrap;
	justify-content: flex-start;
	gap: 0;
}
</style>
