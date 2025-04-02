<!--
	WikiLambda Vue component for a Typed List Type.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-typed-list-type" data-testid="z-typed-list-type">
		<wl-z-object-key-value
			:row-id="rowId"
			:edit="edit"
			:list-item-type="listItemType"
			@change-event="changeType"
		></wl-z-object-key-value>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const typeMixin = require( '../../mixins/typeMixin.js' );
const useMainStore = require( '../../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-typed-list-type',
	components: {
		//
	},
	mixins: [ typeMixin ],
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
			type: Number,
			default: undefined
		},
		listItemType: {
			type: [ String, Object ],
			default: null
		},
		listItemsRowIds: {
			type: Array,
			default() {
				return [];
			}
		}
	},
	data: function () {
		return {
			hasError: false
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getZObjectTypeByRowId'
	] ) ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'setInvalidListItems',
		'clearInvalidListItems',
		'setError',
		'clearErrors'
	] ), {

		/**
		 * Retrieves a list of items to be removed.
		 *
		 * @param {string} newListItemType
		 * @return {Array} - The list of items to be removed.
		 */
		getListItemsForRemoval( newListItemType ) {
			return this.listItemsRowIds
				.filter( ( rowId ) => this.getZObjectTypeByRowId( rowId ) !== newListItemType );
		},

		/**
		 * Handles the change of the type of the list.
		 *
		 * @param {Object} payload
		 * @return {void}
		 */
		changeType: function ( payload ) {
			/**
			 * if the type of the list has changed:
			 * - warn the user this will delete list items (now the 'wrong' type)
			 * - except when the type was changed to Object/Z1: we can clear the errors
			 * - the items that need to be deleted are the ones that are not of the new type
			 */
			const newListItemType = payload.value;
			const isZObject = newListItemType === Constants.Z_OBJECT;
			const isDifferentType = newListItemType !== this.listItemType && newListItemType !== Constants.Z_OBJECT;
			const hasListItems = this.listItemsRowIds.length > 0;

			// If the type was changed to Object/Z1, we can clear the errors
			if ( this.hasError && isZObject ) {
				this.hasError = false;
				this.clearErrors( 0 );
				this.clearInvalidListItems();
				return;
			}

			// If the type was changed to a different type and there are list items, show a warning
			if ( isDifferentType && hasListItems ) {

				// Set the error only once
				if ( !this.hasError ) {
					this.hasError = true;
					this.setError( {
						rowId: 0,
						errorCode: Constants.ERROR_CODES.TYPED_LIST_TYPE_CHANGED,
						errorType: Constants.ERROR_TYPES.WARNING
					} );
				}

				this.setInvalidListItems( {
					parentRowId: this.parentRowId,
					listItems: this.getListItemsForRemoval( newListItemType )
				} );
			}
		}
	} ),
	beforeCreate: function () {
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-typed-list-type {
	margin-bottom: @wl-key-value-set-margin-bottom;
}
</style>
