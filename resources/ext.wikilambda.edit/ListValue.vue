<template>
	<div>
		[
		<ul>
			<li v-for="(item, index) in list" :key="index">
				<button :title="tooltipRemoveListItem" @click="removeItem(index)">
					{{ $i18n( 'wikilambda-editor-removeitem' ) }}
				</button>
				<select v-if="listTypes[index] === 'new'" @change="setNewType($event, index)">
					<option selected
						disabled
						value="None"
					>
						{{ $i18n( 'wikilambda-typeselector-label' ) }}
					</option>
					<option value="string">
						{{ $i18n( 'wikilambda-typeselector-string-or-reference' ) }}
					</option>
					<option value="zobject">
						{{ $i18n( 'wikilambda-typeselector-object' ) }}
					</option>
					<option value="list">
						{{ $i18n( 'wikilambda-typeselector-list' ) }}
					</option>
				</select>
				<input v-else-if="listTypes[index] === 'string'"
					:value="item"
					@input="updateStringValue($event, index)"
				>
				<full-zobject v-else-if="listTypes[index] === 'zobject'"
					:zobject="item"
					:persistent="false"
					@input="updateValue($event, index)"
				></full-zobject>
				<list-value v-else
					:list="item"
					@input="updateValue($event, index)"
				></list-value>
			</li>
			<li>
				<button :title="tooltipAddListItem" @click="addNewItem">
					{{ $i18n( 'wikilambda-editor-additem' ) }}
				</button>
			</li>
		</ul>
		]
	</div>
</template>

<script>
var FullZobject = require( './FullZobject.vue' );

module.exports = {
	name: 'list-value',
	props: [ 'list' ],
	data: function () {
		var listTypes = this.list.map( function ( item ) {
			var type = 'string';
			if ( typeof ( item ) === 'object' ) {
				if ( Array.isArray( item ) ) {
					type = 'list';
				} else {
					type = 'zobject';
				}
			}
			return type;
		} );
		return {
			listTypes: listTypes,
			tooltipRemoveListItem: this.$i18n( 'wikilambda-editor-zlist-removeitem-tooltip' ),
			tooltipAddListItem: this.$i18n( 'wikilambda-editor-zlist-additem-tooltip' )
		};
	},
	methods: {
		addNewItem: function ( /* event */ ) {
			this.list.push( '' );
			this.listTypes.push( 'new' );
			this.$emit( 'input', this.list );
		},
		setNewType: function ( event, index ) {
			var newtype = event.target.value;
			if ( newtype === 'zobject' ) {
				this.$set( this.list, index, {} );
			} else if ( newtype === 'list' ) {
				this.$set( this.list, index, [] );
			} else {
				this.$set( this.list, index, '' );
			}
			this.$set( this.listTypes, index, newtype );
			this.$emit( 'input', this.list );
		},
		removeItem: function ( index ) {
			this.list.splice( index, 1 );
			this.listTypes.splice( index, 1 );
			this.$emit( 'input', this.list );
		},
		updateValue: function ( value, index ) {
			this.$set( this.list, index, value );
			this.$emit( 'input', this.list );
		},
		updateStringValue: function ( event, index ) {
			this.$set( this.list, index, event.target.value );
			this.$emit( 'input', this.list );
		}
	},
	components: {
		'full-zobject': FullZobject
	}
};
</script>
