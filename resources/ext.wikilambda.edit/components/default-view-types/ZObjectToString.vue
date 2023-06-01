<template>
	<!--
		WikiLambda Vue component to represent ZObjects as a string.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div
		v-if="hasLink"
		class="ext-wikilambda-zobject-to-string"
		role="ext-wikilambda-zobject-to-string-link">
		<div class="ext-wikilambda-zobject-to-string">
			<a
				v-if="isBlank"
				class="ext-wikilambda-zobject-to-string-blank"
				@click="expand"
			>{{ name }}</a>
			<a
				v-else
				:href="link"
			>{{ name }}</a>
		</div>
		<div
			v-if="hasChildren"
			class="ext-wikilambda-zobject-to-string">
			&nbsp;(
			<!-- eslint-disable vue/no-v-for-template-key -->
			<template
				v-for="( row, index ) in childRows"
				:key="index"
			>
				<wl-z-object-to-string
					:row-id="row.id"
					@expand="expand"
				></wl-z-object-to-string>
				<span v-if="hasComma( index )">,&nbsp;</span>
			</template>)
		</div>
	</div>
	<div
		v-else
		class="ext-wikilambda-zobject-to-string"
		role="ext-wikilambda-zobject-to-string-text">
		{{ name }}
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-object-to-string',
	components: {
		'wl-z-object-to-string': this
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		}
	},
	computed: $.extend(
		mapGetters( [
			'getLabel',
			'getExpectedTypeOfKey',
			'getZFunctionCallFunctionId',
			'getZFunctionCallArguments',
			'getZReferenceTerminalValue',
			'getZStringTerminalValue',
			'getZObjectTypeByRowId',
			'getZObjectKeyByRowId',
			'getChildrenByParentRowId'
		] ),
		{
			/**
			 * Returns the type of the value of the the ZObject represented
			 * in this component. Depending on the type, we will decide what
			 * kind of string representation to create:
			 *
			 * Z6/String:
			 * * value: this.Z6K1
			 * * name: this.value
			 * * link: -
			 *
			 * Z9/Reference:
			 * * value: this.Z9K1
			 * * name: this.value | getLabel
			 * * link: this.value | toLink
			 *
			 * Z7/Function call:
			 * * value: this.Z7K1
			 * * name: this.value | getLabel
			 * * link: this.value | toLink
			 * * children: all child values except Z1K1 and Z7K1
			 *
			 * Any other object:
			 * * value: this.type
			 * * name: this.value | getLabel
			 * * link: this.value | getLink
			 * * children: all child values except Z1K1
			 *
			 * @return {string}
			 */
			type: function () {
				return this.getZObjectTypeByRowId( this.rowId );
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
			 * Returns the human readable string that identifies this object.
			 * If value is undefined, we generate the placeholder depending
			 * on its type.
			 *
			 * @return {string}
			 */
			name: function () {
				if ( this.isBlank ) {
					return this.placeholder;
				}
				return ( this.type === Constants.Z_STRING ) ?
					this.value :
					this.getLabel( this.value );
			},

			/**
			 * Returns the link to the object if it has any.
			 *
			 * @return {string}
			 */
			link: function () {
				return ( this.hasLink && !this.isBlank ) ? new mw.Title( this.value ).getUrl() : '';
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
					return this.$i18n( 'wikilambda-zobject-to-string-enter-string' );
				}
				if ( missingType === Constants.Z_FUNCTION_CALL ) {
					missingType = Constants.Z_FUNCTION;
				}
				if ( Constants.RESOLVER_TYPES.includes( missingType ) ) {
					missingType = this.expectedType;
				}
				const label = missingType ? this.getLabel( missingType ) : this.getLabel( Constants.Z_OBJECT );
				return this.$i18n( 'wikilambda-zobject-to-string-select-object', label );
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
				return ( this.type === Constants.Z_STRING ) ||
					( this.type === Constants.Z_REFERENCE );
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
					.filter( ( row ) => {
						return ( row.key !== Constants.Z_OBJECT_TYPE );
					} );
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
		 * This will trigger the event till the nearest ZObjectKeyValue
		 * parent, who will toggle the expansion flag.
		 */
		expand: function () {
			this.$emit( 'expand' );
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-zobject-to-string {
	display: flex;
	flex-flow: row wrap;
	justify-content: flex-start;
	gap: 0;

	a.ext-wikilambda-zobject-to-string-blank {
		color: @color-destructive;
	}

	a.ext-wikilambda-zobject-to-string-blank:hover {
		color: @color-destructive--hover;
	}

	a.ext-wikilambda-zobject-to-string-blank:active {
		color: @color-destructive--active;
	}

	a.ext-wikilambda-zobject-to-string-blank:focus {
		color: @color-destructive--focus;
	}
}
</style>
