<!--
	WikiLambda Vue component to represent ZObjects as a string.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		v-if="hasLink"
		class="ext-wikilambda-app-object-to-string"
		data-testid="object-to-string-link">
		<div class="ext-wikilambda-app-object-to-string">
			<a
				v-if="isBlank"
				class="ext-wikilambda-app-object-to-string__blank is-red-link"
				:lang="labelData.langCode"
				:dir="labelData.langDir"
				@click="expand"
			>{{ labelData.label }}</a>
			<a
				v-else
				:href="link"
				:lang="labelData.langCode"
				:dir="labelData.langDir"
			>{{ labelData.label }}</a>
		</div
		><span
			v-if="hasChildren"
			class="ext-wikilambda-app-object-to-string__children">
			&nbsp;<span class="ext-wikilambda-app-object-to-string__divider">(</span
			><span class="ext-wikilambda-app-object-to-string__child">
				<template
					v-for="( row, index ) in childRows"
					:key="index">
					<wl-z-object-to-string
						:row-id="row.id"
						@expand="expand"
					></wl-z-object-to-string
					><span
						v-if="hasComma( index )"
						class="ext-wikilambda-app-object-to-string__divider"
					>,&nbsp;</span>
				</template>
			</span><span class="ext-wikilambda-app-object-to-string__divider">)</span>
		</span>
	</div>
	<div
		v-else
		class="ext-wikilambda-app-object-to-string"
		data-testid="object-to-string-text"
		:lang="labelData.langCode"
		:dir="labelData.langDir"
	>
		"{{ labelData.label }}"
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const Constants = require( '../../Constants.js' ),
	useMainStore = require( '../../store/index.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	LabelData = require( '../../store/classes/LabelData.js' ),
	{ mapState } = require( 'pinia' );

module.exports = exports = defineComponent( {
	name: 'wl-z-object-to-string',
	components: {
		'wl-z-object-to-string': this
	},
	mixins: [ typeUtils ],
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		}
	},
	computed: Object.assign(
		mapState( useMainStore, [
			'getLabelData',
			'getExpectedTypeOfKey',
			'getZFunctionCallFunctionId',
			'getZFunctionCallArguments',
			'getZReferenceTerminalValue',
			'getZStringTerminalValue',
			'getZObjectTypeByRowId',
			'getZObjectKeyByRowId',
			'getChildrenByParentRowId',
			'getUserLangCode'
		] ),
		{
			/**
			 * Returns the type of the value of the the ZObject represented
			 * in this component. Depending on the type, we will decide what
			 * kind of string representation to create:
			 *
			 * Z6/String:
			 * * value: this.Z6K1
			 * * label: this.value
			 * * link: -
			 *
			 * Z9/Reference:
			 * * value: this.Z9K1
			 * * label: this.value | getLabelData.label
			 * * link: this.value | toLink
			 *
			 * Z7/Function call:
			 * * value: this.Z7K1
			 * * label: this.value | getLabelData.label
			 * * link: this.value | toLink
			 * * children: all child values except Z1K1 and Z7K1
			 *
			 * Any other object:
			 * * value: this.type
			 * * label: this.value | getLabelData.label
			 * * link: this.value | getLink
			 * * children: all child values except Z1K1
			 *
			 * @return {string}
			 */
			type: function () {
				const noArgs = true;
				return this.typeToString( this.getZObjectTypeByRowId( this.rowId ), noArgs );
			},

			/**
			 * Returns the value to represent in string format depending
			 * on the type:
			 * * In the case of function call, returns the Zid of the function.
			 * * In the case of terminal object, returns its terminal value.
			 * * In the case of any other object, returns its type.
			 *
			 * @return {string}
			 */
			value: function () {
				if ( this.type === Constants.Z_FUNCTION_CALL ) {
					return this.getZFunctionCallFunctionId( this.rowId );
				}
				if ( this.type === Constants.Z_STRING ) {
					return this.getZStringTerminalValue( this.rowId );
				}
				if ( this.type === Constants.Z_REFERENCE ) {
					return this.getZReferenceTerminalValue( this.rowId );
				}
				return this.type;
			},

			/**
			 * Returns the LabelData object for this object.
			 * If value is undefined, we generate the placeholder depending
			 * on its type.
			 *
			 * @return {LabelData}
			 */
			labelData: function () {
				return this.isBlank ?
					LabelData.fromString( this.placeholder ) :
					this.getLabelData( this.value );
			},

			/**
			 * Returns the link to the object if it has any.
			 *
			 * @return {string}
			 */
			link: function () {
				return ( this.hasLink && !this.isBlank ) ? '/view/' + this.getUserLangCode + '/' + this.value : '';
			},

			/**
			 * Returns the key of the key-value pair of this component.
			 *
			 * @return {string}
			 */
			key: function () {
				return this.getZObjectKeyByRowId( this.rowId );
			},

			/**
			 * Returns the expected (or bound) type for the value of
			 * the key-value pair represented in this component.
			 *
			 * @return {string}
			 */
			expectedType: function () {
				return this.getExpectedTypeOfKey( this.key );
			},

			/**
			 * Returns a type-dependent placeholder to be printed in
			 * cases of undefined values.
			 *
			 * @return {string}
			 */
			placeholder: function () {
				let missingType = this.type;
				if ( missingType === Constants.Z_STRING ) {
					return this.$i18n( 'wikilambda-zobject-to-string-enter-string' ).text();
				}
				if ( missingType === Constants.Z_FUNCTION_CALL ) {
					missingType = Constants.Z_FUNCTION;
				}
				if ( Constants.RESOLVER_TYPES.includes( missingType ) ) {
					missingType = this.expectedType;
				}
				const label = missingType ?
					this.getLabelData( missingType ).label :
					this.getLabelData( Constants.Z_OBJECT ).label;
				return this.$i18n( 'wikilambda-zobject-to-string-select-object', label ).text();
			},

			/**
			 * Returns whether the object represented should link to somewhere
			 * or not. Only non-blank terminal strings don't have a link.
			 *
			 * @return {boolean}
			 */
			hasLink: function () {
				return this.isBlank || ( this.type !== Constants.Z_STRING );
			},

			/**
			 * Returns whether this object is terminal (Z6/String or Z9/Reference).
			 *
			 * @return {boolean}
			 */
			isTerminal: function () {
				return (
					( this.type === Constants.Z_REFERENCE ) ||
					( this.type === Constants.Z_STRING )
				);
			},

			/**
			 * Returns whether this object is blank (value is undefined)
			 *
			 * @return {boolean}
			 */
			isBlank: function () {
				return ( this.value === undefined );
			},

			/**
			 * Returns the array of children to represent in parenthesis.
			 * These are the arguments in case this object is a function call,
			 * or the object keys in case it's a non terminal zobject.
			 * It excludes the key Z1K1/Type.
			 *
			 * @return {Array}
			 */
			childRows: function () {
				if ( this.isTerminal ) {
					return [];
				}
				if ( this.type === Constants.Z_FUNCTION_CALL ) {
					return this.getZFunctionCallArguments( this.rowId );
				}
				return this.getChildrenByParentRowId( this.rowId )
					.filter( ( row ) => ( row.key !== Constants.Z_OBJECT_TYPE ) );
			},

			/**
			 * Returns whether this object has any children to represent
			 *
			 * @return {boolean}
			 */
			hasChildren: function () {
				return this.childRows.length > 0;
			}
		}
	),
	methods: {
		/**
		 * Whether a ZObject child needs a trailing comma given its index
		 *
		 * @param {number} index
		 * @return {boolean}
		 */
		hasComma: function ( index ) {
			return ( ( index + 1 ) < this.childRows.length );
		},

		/**
		 * Emits event 'expand' when an unselected value is clicked.
		 * This will propagate the event till the nearest ZObjectKeyValue
		 * parent, who will set the expansion flag to true.
		 */
		expand: function () {
			this.$emit( 'expand', true );
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-object-to-string {
	display: inline;

	.ext-wikilambda-app-object-to-string__child {
		white-space: normal;
		word-break: break-word;
	}

	.ext-wikilambda-app-object-to-string__children {
		white-space: nowrap; /* Prevent wrapping */
	}

	.ext-wikilambda-app-object-to-string__divider {
		color: @color-subtle;
		white-space: nowrap; /* Prevent wrapping */
	}

	.ext-wikilambda-app-object-to-string__blank {
		.cdx-mixin-link();
	}
}
</style>
