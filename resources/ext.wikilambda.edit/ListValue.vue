<template>
	<div>
		[
		<ul>
			<li v-for="(item, index) in list" :key="index">
				<button @click="removeItem(index)">
					-
				</button>
				<select v-if="listTypes[index] === 'new'" @change="setNewType($event, index)">
					<option selected
						disabled
						value="None"
					>
						Value Type
					</option>
					<option value="string">
						String or Reference
					</option>
					<option value="zobject">
						ZObject
					</option>
					<option value="list">
						List
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
				<button @click="addNewItem">
					+
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
			listTypes: listTypes
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
