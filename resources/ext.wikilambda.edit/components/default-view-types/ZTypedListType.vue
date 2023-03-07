<template>
	<!--
		WikiLambda Vue component for a Typed List Type.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-ztyped-list-type">
		<!-- TODO(T330190): include a flow for removing children items if type has changed-->
		<label class="ext-wikilambda-ztyped-list-type__label">
			{{ keyLabel }}
		</label>
		<wl-z-object-type
			:row-id="rowId"
			:edit="edit"
			:expected-type="expectedType"
			@set-value="setValue"
		></wl-z-object-type>
	</div>
</template>

<script>
var ZObjectType = require( './ZObjectType.vue' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-typed-list-type',
	components: {
		'wl-z-object-type': ZObjectType
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
		},

		/**
		 * The label for a type of a list. This must be hardcoded because the FE represents these litsts
		 * as benjamin arrays, which don't have a key to index on.
		 *
		 * @return {string}
		 */
		keyLabel: function () {
			return this.$i18n( 'wikilambda-list-items-type-label' ).text();
		}
	} ),
	methods: $.extend( mapActions( [ 'setValueByRowIdAndPath' ] ),
		{
			// although this is duplicated code from ZObjectKeyValue, we are too deeply nested
			// to try bubbling this event up, so we just call the method directly here.
			setValue: function ( payload ) {
				this.setValueByRowIdAndPath( {
					rowId: this.rowId,
					keyPath: payload.keyPath ? payload.keyPath : [],
					value: payload.value
				} );
			}
		}
	)
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
