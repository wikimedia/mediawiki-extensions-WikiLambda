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
			<!-- eslint-disable vue/no-v-for-template-key -->
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
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

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
	computed: Object.assign( {}, mapState( useMainStore, [
		'getUserLangCode',
		'getLabelData'
	] ), {
		/**
		 * Whether the input type is a reference or a function call
		 *
		 * @return {boolean}
		 */
		mode: function () {
			return ( typeof this.type === 'string' ) ?
				Constants.Z_REFERENCE :
				this.type[ Constants.Z_OBJECT_TYPE ];
		},
		/**
		 * The first Zid to convert into link, either the reference
		 * terminal zid, or the ID of the function call if it's a
		 * generic type
		 *
		 * @return {string|undefined}
		 */
		zid: function () {
			switch ( this.mode ) {
				case Constants.Z_REFERENCE:
					return this.type;
				case Constants.Z_FUNCTION_CALL:
					return this.type[ Constants.Z_FUNCTION_CALL_FUNCTION ];
				default:
					return undefined;
			}
		},
		/**
		 * Returns the wiki URL for the main zid
		 *
		 * @return {string}
		 */
		wikiUrl: function () {
			return urlUtils.generateViewUrl( { langCode: this.getUserLangCode, zid: this.zid } );
		},
		/**
		 * Returns the label data of the main Zid
		 *
		 * @return {LabelData}
		 */
		labelData: function () {
			return this.getLabelData( this.zid );
		},
		/**
		 * If the type is a generic type (and represented by a function
		 * call), returns the arguments, which are all the keys excluding
		 * Z1K1 and Z7K1
		 *
		 * @return {Array}
		 */
		args: function () {
			if ( this.mode === Constants.Z_FUNCTION_CALL ) {
				return Object.keys( this.type ).filter( ( key ) => (
					( key !== Constants.Z_OBJECT_TYPE ) &&
						( key !== Constants.Z_FUNCTION_CALL_FUNCTION )
				) );
			}
			return [];
		},
		/**
		 * Whether there are any args to list after the main zid
		 *
		 * @return {boolean}
		 */
		hasArgs: function () {
			return this.args.length > 0;
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'fetchZids'
	] ), {
		/**
		 * Whether a ZObject child needs a trailing comma given its index
		 *
		 * @param {number} index
		 * @return {boolean}
		 */
		hasComma: function ( index ) {
			return ( ( index + 1 ) < this.args.length );
		}
	} ),
	mounted: function () {
		if ( this.zid ) {
			this.fetchZids( { zids: [ this.zid ] } );
		}
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
