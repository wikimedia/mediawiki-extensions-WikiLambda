<template>
	<!--
		WikiLambda Vue component for a Typed List.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div
		class="ext-wikilambda-ztyped-list"
		:class="nestingDepthClass"
	>
		<!-- Type of list -->
		<wl-z-typed-list-type
			v-if="expanded"
			:row-id="typeRowId"
			:edit="edit"
			:list-type="type"
			:parent-row-id="rowId"
		></wl-z-typed-list-type>
		<!-- Label for list items -->
		<label
			v-if="expanded"
			class="ext-wikilambda-ztyped-list__label"
		>
			{{ itemsLabel }}
		</label>
		<!-- List items -->
		<ul
			:id="indentation"
			class="ext-wikilambda-ztyped-list__wrapper"
		>
			<li
				v-for="item in listItemsRowIds"
				:key="item"
				class="ext-wikilambda-ztyped-list__wrapper-items"
			>
				<wl-z-typed-list-item
					ref="listItemElements"
					:row-id="item"
					:edit="edit"
					:list-type="type"
					:is-terminal-item="isTerminalItem( item )"
				></wl-z-typed-list-item>
			</li>
		</ul>
		<!-- Button to add a new item -->
		<cdx-button
			v-if="edit"
			class="ext-wikilambda-ztyped-list__add-button"
			@click="addListItem"
		>
			{{ $i18n( 'wikilambda-add-list-item-button' ).text() }}
		</cdx-button>
	</div>
</template>

<script>
var ZTypedListItem = require( './ZTypedListItem.vue' ),
	ZTypedListType = require( './ZTypedListType.vue' ),
	Constants = require( '../../Constants.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-typed-list',
	components: {
		'wl-z-typed-list-item': ZTypedListItem,
		'wl-z-typed-list-type': ZTypedListType,
		'cdx-button': CdxButton
	},
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
		expanded: {
			type: Boolean,
			required: true
		},
		depth: {
			type: Number,
			required: true
		}
	},
	computed: $.extend(
		mapGetters( [
			'getChildrenByParentRowId',
			'getZObjectTypeByRowId'
		] ),
		{
			/**
			 * Gets the set of ids that compose this typed list, including the type itself
			 *
			 * @return {Array}
			 */
			childRowIds: function () {
				return this.getChildrenByParentRowId( this.rowId )
					.map( function ( row ) { return row.id; } );
			},
			/**
			 * Returns the list items without the type (the first item in the list)
			 *
			 * @return {Array} list
			 */
			listItemsRowIds: function () {
				return this.childRowIds.slice( 1 );
			},
			/**
			 * Returns the id for the first item on the list, which represents the type
			 *
			 * @return {string}
			 */
			typeRowId: function () {
				return this.childRowIds[ 0 ];
			},
			/**
			 * The ZID of the type of this list
			 *
			 * @return {string} type
			 */
			type: function () {
				// FIXME(T331149): figure out how to handle when the type is a function call
				return this.getZObjectTypeByRowId( this.typeRowId );
			},
			/**
			 * Returns the css class that identifies the nesting level
			 *
			 * @return {string}
			 */
			nestingDepthClass: function () {
				if ( this.expanded ) {
					return [
						'ext-wikilambda-default-key-depth',
						'ext-wikilambda-key-value-set',
						`ext-wikilambda-key-level-${this.depth}`
					];
				}
			},

			indentation: function () {
				return this.expanded ? 'typed-list-expanded' : 'typed-list-collapsed';
			},

			/**
			 * Returns the key label for the list of items.
			 * Since the FE represents typed lists as benjamin arrays, this must be hardcoded
			 *
			 * @return {string}
			 */
			itemsLabel: function () {
				return this.$i18n( 'wikilambda-list-items-label' ).text();
			}
		}
	),
	methods: $.extend( {}, mapActions( [ 'recalculateZListIndex' ] ), {
		addListItem: function () {
			this.$emit( 'set-type', { value: this.type, append: true } );
		},
		isTerminalItem: function ( item ) {
			// we cannot assume an item is the same type as the list type
			// because in the case of a Z1 typed list, each element can be different
			const itemType = this.getZObjectTypeByRowId( item );

			// although the logic is similar to `hasExpandedMode`,
			// that can't be passed down because it needs to check
			// different properties (and it has different rules for edit)
			const isTerminalListItem = (
				itemType === Constants.Z_OBJECT ||
				itemType === Constants.Z_STRING ||
				itemType === Constants.Z_REFERENCE
			);

			return isTerminalListItem && !this.edit;
		}
	} ),
	watch: {
		childRowIds: function ( list, prevList ) {
			// if an item was deleted from the list
			if ( list.length < prevList.length ) {
				this.recalculateZListIndex( this.zobjectId );
			}

			// when a new item is added the list, toggle the expansion in the child component
			if ( list.length > prevList.length ) {
				// need to wait until the new item is rendered
				this.$nextTick( function () {
					const newItem = this.$refs.listItemElements[ this.$refs.listItemElements.length - 1 ];
					newItem.setExpanded();
				} );
			}
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-ztyped-list {
	// we can't use a class because otherwise mediawiki ul styles will be applied
	// this overrides them
	/* stylelint-disable selector-max-id */
	#typed-list-expanded {
		margin: @spacing-0;
		padding: @spacing-0;
	}

	#typed-list-collapsed {
		margin: @spacing-0 @spacing-0 @spacing-0 @spacing-150;
		padding: @spacing-0;
	}

	&__label {
		display: inline-block;
		margin-bottom: @spacing-12;
		color: @color-subtle;
		font-weight: @font-weight-normal;
	}

	&__add-button {
		margin-left: @spacing-150;
		margin-top: @spacing-50;
	}

	&__wrapper {
		list-style: none;

		&-items:last-child {
			margin-bottom: @spacing-0;
		}
	}

	&-no-bullet {
		display: flex;
	}
}

</style>