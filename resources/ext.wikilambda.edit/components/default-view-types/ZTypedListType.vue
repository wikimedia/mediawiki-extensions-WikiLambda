<template>
	<!--
		WikiLambda Vue component for a Typed List Type.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-ztyped-list-type">
		<wl-z-object-key-value
			:row-id="rowId"
			:edit="edit"
			:list-type="listType"
			@change-event="changeType"
		></wl-z-object-key-value>
	</div>
</template>

<script>
var typeUtils = require( '../../mixins/typeUtils.js' ),
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-z-typed-list-type',
	components: {
		//
	},
	mixins: [ typeUtils ],
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		},
		parentRowId: {
			type: String,
			default: undefined
		},
		listType: {
			type: String,
			default: null
		},
		listItemsRowIds: {
			type: Array,
			default() {
				return [];
			}
		}
	},
	computed: $.extend( mapGetters( [
		'getLabelData',
		'getExpectedTypeOfKey',
		'getZObjectKeyByRowId'
	] ),
	{
		/**
		 * The parent key of the list type.
		 * They key for the list type itself will be '0', so we need the parent key to access the type
		 *
		 * @return {string}
		 */
		parentKey: function () {
			return this.getZObjectKeyByRowId( this.parentRowId );
		},

		/**
		 * The expected type of the list
		 * We use this to notify the ZObjectType.vue component if the type is alterable or not.
		 *
		 * @return {string}
		 */
		expectedType: function () {
			const expectedType = this.getExpectedTypeOfKey( this.parentKey );
			return this.typedListStringToType( expectedType );
		}
	} ),
	methods: $.extend( mapActions( [
		'setListItemsForRemoval',
		'setError'
	] ), {
		changeType: function ( payload ) {
			// if the type of the list has changed, warn the user this will delete list items (now the 'wrong' type)
			// if the type was changed to Z1, we don't need to do this
			// TODO: we can be smarter here and check each item to know what actually needs to be deleted
			// (instead of deleting all items)
			if ( payload.value !== Constants.Z_OBJECT && payload.value !== this.listType ) {

				// TODO (T332990): Revisit how we want to display a warning to the user about deletion
				this.setError( {
					rowId: 0,
					errorCode: Constants.errorCodes.TYPED_LIST_TYPE_CHANGED,
					errorType: Constants.errorTypes.WARNING
				} );

				this.setListItemsForRemoval( {
					parentRowId: this.parentRowId,
					listItems: this.listItemsRowIds
				} );
			}
		}
	} ),
	beforeCreate: function () {
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-ztyped-list-type {
	margin-bottom: @wl-key-value-set-margin-bottom;

	&__label {
		display: inline-block;
		color: @color-subtle;
		font-weight: @font-weight-normal;
		margin-bottom: @spacing-12;
	}
}
</style>
